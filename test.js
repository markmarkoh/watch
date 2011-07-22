console.log('mistake');
var ct = '<div id="me"><hr />CHANGED AGAIN!!!!<hr /></div>';
if (document.body) { document.body.innerHTML = ct};

document.getElementById("me").addEventListener("click", function() {
            this.style.display = 'none';
            var that = this;
            window.setInterval(function() {
                that.style.display = that.style.display === "block" ? "none" : "block";
        }, 1000);
            });

var me = document.getElementById("me");
var evt = document.createEvent("MouseEvent");
evt.target = me;
evt.type = "click";
console.log(evt);
document.dispatchEvent(evt);
