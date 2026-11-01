function getJsBridge() {
    window._dsf = window._dsf || {};
    // Isolated call-id. Do not use a page-owned window.dscb / window.callID
    // counter — overlapping async calls would then reuse the same stub.
    var dscb = 0;
    return {
        call: function (method, args, cb) {
            var ret = "";
            if (typeof args == "function") {
                cb = args;
                args = {}
            }
            if (typeof cb == "function") {
                var cbName = "dscb" + dscb++;
                window[cbName] = cb;
                args["_dscbstub"] = cbName
            }
            console.log('cb: ',JSON.stringify(args) , typeof cb == "function");
            args = JSON.stringify(args || {});
            if (window._dswk) {

                ret = prompt(window._dswk + method, args)
            } else {
                if (typeof _dsbridge == "function") {
                    ret = _dsbridge(method, args)
                } else {
                    ret = _dsbridge.call(method, args)
                }
            }
            return ret
        }, register: function (name, fun) {
            if (typeof name == "object") {
                Object.assign(window._dsf, name)
            } else {
                window._dsf[name] = fun
            }
        }
    }
}

window.dsBridge = getJsBridge();
