//load socket.io

//alot of this code is borrowed from @slexton's yepnope
(function (window, doc) {
  var docElement  = doc.documentElement,
      sTimeout    = window.setTimeout,
      firstScript = doc.getElementsByTagName('script')[0],
      // Before you get mad about browser sniffs, please read:
      // https://github.com/Modernizr/Modernizr/wiki/Undetectables
      // If you have a better solution, we are actively looking to solve the problem
      isGecko               = ( 'MozAppearance' in docElement.style ),
      isGeckoLTE18          = isGecko && !! doc.createRange().compareNode,
      isGeckoGT18           = isGecko && ! isGeckoLTE18,
      insBeforeObj          = isGeckoLTE18 ? docElement : firstScript.parentNode,
      // Thanks to @jdalton for showing us this opera detection (by way of @kangax) (and probably @miketaylr too, or whatever...)
      isOpera               = window.opera && toString.call( window.opera ) == '[object Opera]',
      isWebkit              = ( 'webkitAppearance' in docElement.style ),
      isNewerWebkit         = isWebkit && 'async' in doc.createElement('script'),
      isArray               = Array.isArray || function (obj) {
        return toString.call(obj) == '[object Array]';
      },
      dummyFn               = function () {},
      watch                 = {},
      watch_queue           = [],
      eventHandler          = {},
      socket;     
      
      /* Loader helper functions */
      function isFileReady ( readyState ) {
        // Check to see if any of the ways a file can be ready are available as properties on the file's element
        return ( ! readyState || readyState == 'loaded' || readyState == 'complete' );
      }
      
      function injectJs ( src, execWhenReady ) {
          var script = doc.createElement( 'script' ),
              done;

          firstScript = doc.getElementsByTagName('script')[0];
          script.src = src + '?t=' + (new Date()).getTime();

          // Bind to load events
          script.onreadystatechange = script.onload = function () {

            if ( ! done && isFileReady( script.readyState ) ) {

              // Set done to prevent this function from being called twice.
              done = 1;
              execWhenReady();

              // Handle memory leak in IE
              script.onload = script.onreadystatechange = null;
            }
          };

          // Inject script into to document
          // or immediately callback if we know there
          // was previously a timeout error
          firstScript.parentNode.insertBefore( script, firstScript );
        }

        // Takes a preloaded css obj (changes in different browsers) and injects it into the head
        // in the appropriate order
        // Many credits to John Hann (@unscriptable) for a lot of the ideas here - found in the css! plugin for RequireJS
        function injectCss ( href, execWhenReady ) {

          // Create stylesheet link
          var link = doc.createElement( 'link' ),
              done;
          
          firstScript = doc.getElementsByTagName('script')[0];

          // Add attributes
          link.href = href + '?t=' + (new Date()).getTime();;
          link.rel  = 'stylesheet';
          link.type = 'text/css';

          // Poll for changes in webkit and gecko
          if ( isWebkit || isGecko  ) {
            // A self executing function with a sTimeout poll to call itself
            // again until the css file is added successfully
            var poll = function ( link ) {
              sTimeout( function () {
                // Don't run again if we're already done
                if ( ! done ) {
                  try {
                    // In supporting browsers, we can see the length of the cssRules of the file go up
                    if ( link.sheet.cssRules.length ) {
                      // Then turn off the poll
                      done = 1;
                      // And execute a function to execute callbacks when all dependencies are met
                      execWhenReady();
                    }
                    // otherwise, wait another interval and try again
                    else {
                      poll( link );
                    }
                  }
                  catch ( ex ) {
                    // In the case that the browser does not support the cssRules array (cross domain)
                    // just check the error message to see if it's a security error
                    if ( ( ex.code == 1e3 ) || ( ex.message == 'security' || ex.message == 'denied' ) ) {
                      // if it's a security error, that means it loaded a cross domain file, so stop the timeout loop
                      done = 1;
                      // and execute a check to see if we can run the callback(s) immediately after this function ends
                      sTimeout( function () {
                        execWhenReady();
                      }, 0 );
                    }
                    // otherwise, continue to poll
                    else {
                      poll( link );
                    }
                  }
                }
              }, 0 );
            };
            poll( link );

          }
          // Onload handler for IE and Opera
          else {
            // In browsers that allow the onload event on link tags, just use it
            link.onload = function () {
              if ( ! done ) {
                // Set our flag to complete
                done = 1;
                // Check to see if we can call the callback
                sTimeout( function () {
                  execWhenReady();
                }, 0 );
              }
            };

            // if we shouldn't inject due to error or settings, just call this right away
            link.onload();
          }

          // Inject CSS
          // only inject if there are no errors, and we didn't set the no inject flag ( oldObj.e )
          firstScript.parentNode.insertBefore( link, firstScript );
          execWhenReady();
        }
 
  //delete an element that matches the src or href
  function deleteElem(location, type, cleanup, callback) {
    if (typeof cleanup === 'function') {
      cleanup(type);
    }
    var elements = (type === 'js' ? doc.getElementsByTagName('script') : doc.getElementsByTagName('link')),
        element,
        i, l = elements.length;
        
    for(i = 0; i< l; i++) {
      element = elements[i];
      if ( (type === 'js' && element.src.match("^" + location)) || (type === 'css' && element.href.match("^" + location)) ) {
        element.parentNode.removeChild(element);
        callback();
        break;
      }
    }
  }
   
  /*
    external API call for css, currently only supports *

    ex:
    _watch.css("*");
    _watch.css("*", function() { //cleanup }, function() { //reinit })
  */
  function css(selector, cleanup, reinit) {
    var links, link, 
        i, props;
    if (selector === "*") {
      links = doc.getElementsByTagName('link');
        for(i = 0; i < links.length; i++) {
          link = links[i];
          if (link.rel === "stylesheet") {
            props =  {name : link.attributes.getNamedItem('href').nodeValue, location : link.href, type: "css"};
            queue(props, cleanup, reinit);
          }
        }
     }
  }
  
  /*
    external API call for js
    
    ex: 
    _watch.js("test.js");
    _watch.js("test.js", function() { //cleanup }, function() { //reinit });
  */
  function js(selector, cleanup, reinit) {
      //let's consistantly process files as an array
      if ( ! isArray(selector) ) {
           selector = [selector];
      }
      
      
      var len = selector.length,
          scripts = getScriptsBySrc(),
          file, script,
          i, props;
      for(i = 0; i < len; i++) {
        file = selector[i];
        for(script in scripts) {
          if (script.endsWith(file)) {
            // watch this file
            cleanup = cleanup || dummyFn;
            reinit = reinit || dummyFn;
            props = { name: script, location: scripts[script].src, type: "js", cleanup: cleanup, reinit: reinit};
            queue(props, cleanup, reinit);
          }
        }
      }

  }
  
  //add to global queue or process if socket is open
  function queue(props, cleanup, reinit) {
    if("socket" in watch) {
      socket.emit("watchfile", props);
    } else {
      watch_queue.push(props);
    }
    cleanup = cleanup || dummyFn;
    reinit = reinit || dummyFn;
    eventHandler[props["name"]] = {cleanup: cleanup, reinit: reinit}
  }

  //helper so we can refer to /files/js/test.js as test.js
  String.prototype.endsWith = function(search) {
    return this.match(search + "$");
  }
  
  //returns a assoc array of scrps that have an external src
  function getScriptsBySrc() {
    var scripts = {},
        i,
        src,
        scriptElems = doc.getElementsByTagName('script'),
        len = scriptElems.length;
        
    for(i = 0; i < len; i++) {
      src = scriptElems[i].attributes.getNamedItem('src');
      if(src && 'nodeValue' in src) { 
        scripts[src.nodeValue] = scriptElems[i];
      }
    }
    return scripts;
  }

  injectJs("http://localhost:7201/socket.io/socket.io.js", function() {
    socket = io.connect('http://localhost:7201');

  	socket.on('file changed', function (data) {  	  
  		deleteElem(data.location, data.type,
  		 eventHandler[data.name].cleanup,
  		 function() {
  		  if (data.type === "css") {
  		    injectCss(data.location, function () {
  		      eventHandler[data.name].reinit('test');
    		  });
  		  } else if (data.type === "js") {
  		    injectJs(data.location, function () {
  		      eventHandler[data.name].reinit();
  		    })
  		  }
  		})
  	});

    //if we started watching any files while socket was setting up    
    while(data = watch_queue.pop()) {
        socket.emit("watchfile", data);
    }
  });

  //setup API
  watch.css = css;
  watch.js = js;
  
  //expose API globally
  window._watch = watch;
  
})(this, this.document);
