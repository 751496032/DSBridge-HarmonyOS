const dsBridge = {
    call: function (method, args, callback) {
        let params = {data: args === undefined ? null : args}
        if (callback != null && typeof callback == 'function') {
            const callName = "dscall" + (window.callID++)
            window[callName] = callback
            params["_dscbstub"] = callName
        }
        let paramsStr = JSON.stringify(params)
        let res = ""
        if (window._dsbridge){
            res = window._dsbridge.call(method, paramsStr)
        }
        return JSON.parse(res).data
    },
    register: function (method, func, async) {
        if (window._dsaf && window._dsf){
            let obj = async ? window._dsaf : window._dsf
            obj[method] = func
        }

    },
    registerAsyn: function (method, func) {
        this.register(method, func, true)
    },
    registerAsync: function (method, func) {
        this.register(method, func, true)
    }
};

(function (){
    const manager = {
        _dsf: {
            _obs: {}
        },
        _dsaf: {
            _obs: {}
        },
        bridge: dsBridge,
        _handleMessageFromNative: function (info) {

            let arg = JSON.parse(info.data);
            let ret = {
                id: info.callbackId, complete: true
            }
            let f = this._dsf[info.method];
            let af = this._dsaf[info.method]
            let callSyn = function (f, ob) {
                ret.data = f.apply(ob, arg)
                this.bridge.call("_dsb.returnValue", ret)
            }
            let callAsync = function (f, ob) {
                arg.push(function (data, complete) {
                    ret.data = data;
                    ret.complete = complete !== false;
                    this.bridge.call("_dsb.returnValue", ret)
                })
                f.apply(ob, arg)
            }
            if (f) {
                callSyn(f, this._dsf);
            } else if (af) {
                callAsync(af, this._dsaf);
            }
        }
    }

    for (let attr in manager) {
        window[attr] = manager[attr]
        console.log(attr)
    }
})();

