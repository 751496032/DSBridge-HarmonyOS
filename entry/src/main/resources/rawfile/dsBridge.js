// @ts-nocheck
const bridge = {
    call: function (method, args, callback) {
        let params = {data: args === undefined ? null : args}
        if (callback != null && typeof callback == 'function') {
            if (!window.callID) {
                window.callID = 0
            }
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
            if (typeof func == "object") {
                obj._obs[method] = func;
            } else {
                obj[method] = func;
            }
        }

    },
    registerAsyn: function (method, func) {
        this.register(method, func, true)
    },
    registerAsync: function (method, func) {
        this.register(method, func, true)
    },
    hasNativeMethod: function (method) {
        return this.call("_dsb.hasNativeMethod", {name: method})
    },
    close: function () {
        this.call("_dsb.closePage")
    },
};

(function (){
    const manager = {
        _dsf: {
            _obs: {}
        },
        _dsaf: {
            _obs: {}
        },
        dsBridge: bridge,
        close: function () {
            bridge.close()
        },
        _handleMessageFromNative: function (info) {

            let arg = JSON.parse(info.data);
            let ret = {
                id: info.callbackId, complete: true
            }
            let f = this._dsf[info.method];
            let af = this._dsaf[info.method]
            let callSyn = function (f, ob) {
                ret.data = f.apply(ob, arg)
                bridge.call("_dsb.returnValue", ret)
            }
            let callAsync = function (f, ob) {
                arg.push(function (data, complete) {
                    ret.data = data;
                    ret.complete = complete !== false;
                    bridge.call("_dsb.returnValue", ret)
                })
                f.apply(ob, arg)
            }
            if (f) {
                callSyn(f, this._dsf);
            } else if (af) {
                callAsync(af, this._dsaf);
            }else {
                // namespace
                let name = info.method.split('.');
                if (name.length<2) return;
                let method=name.pop();
                let namespace=name.join('.')
                let obs = this._dsf._obs;
                let ob = obs[namespace] || {};
                let m = ob[method];
                if (m && typeof m == "function") {
                    callSyn(m, ob);
                    return;
                }
                obs = this._dsaf._obs;
                ob = obs[namespace] || {};
                m = ob[method];
                if (m && typeof m == "function") {
                    callAsync(m, ob);
                    return;
                }
            }
        }
    }

    for (let attr in manager) {
        window[attr] = manager[attr]
        console.log(attr)
    }

    dsBridge.register("_hasJavascriptMethod", (method) => {
        const name = method.split('.')
        if (name.length < 2) {
            return !!(_dsf[name] || _dsaf[name])
        } else {
            // namespace
            let method = name.pop()
            let namespace = name.join('.')
            let ob = _dsf._obs[namespace] || _dsaf._obs[namespace]
            return ob && !!ob[method]
        }
    })

})();

// module.exports = dsBridge;
// export default dsBridge;

