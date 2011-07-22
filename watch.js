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
      watch                 = {};      
      
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
        }
 
  //delete an element that matches the src or href
  function deleteElem(location, type, callback) {
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
 
  watch_queue = [];
  function css(selector) {
    var links, link, 
        i, props;
    if (selector === "*") {
      links = doc.getElementsByTagName('link');
        for(i = 0; i < links.length; i++) {
          link = links[i];
          if (link.rel === "stylesheet") {
            props =  {name : link.attributes.getNamedItem('href').nodeValue, location : link.href, type: "css"};
            if('socket' in watch) {
                watch.socket.emit("watchfile", props);
            } else {
                watch_queue.push(props);
            }

          }
        }
     }
  }

  // _watch.js(['file.js', 'test.js'], function () {}, function () {});
  function js(files, cleanup, reinit) {
      //let's consistantly process files as an array
      if ( ! isArray(files) ) {
           files = [files];
      }

  }
  watch.loadCSS = injectCss;
  watch.loadJS = injectJs;
  watch.css = css;
  
  injectJs("http://localhost:7201/socket.io/socket.io.js", function() {
    console.log(watch)
    var socket = io.connect('http://localhost:7201');

  	//sanity
  	socket.on('news', function (data) {
      	console.log('news', data);
     	});

  	socket.on('file changed', function (data) {
  	  console.log(data);
  		deleteElem(data.location, data.type, function() {
  		  if (data.type === "css") {
  		    injectCss(data.location, function () {
    		    console.log('refreshed');
    		  });
  		  } else if (data.type === "js") {
  		    injectJs(data.location, function () {
  		      console.log('refreshed');
  		    })
  		  }
  		})
  	});

    //if we started watching any files while socket was
    //setting up
    for (var i = 0; i < watch_queue.length; i++) {
        socket.emit("watchfile", watch_queue.pop());
    }

    /* TESTING */
    var testJS = doc.getElementsByTagName('script')[2];
  	//start watching a file
    socket.emit("watchfile", {name : "test.js", location : testJS.src, type : "js" });
    watch.socket = socket;
  });
  
  window._watch = watch;
})(this, this.document);
