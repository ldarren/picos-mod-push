const
SESSION_TYPE='webpush',
path=require('path'),
apn=require('apn'),
args= require('pico-args'),
pObj=require('pico-common').export('pico/obj'),
pUtil= require('picos-util'),
Session= require('picos-session'),
apnConnected = function(){ console.log('apn connected') },
apnDisconnected = function(){ console.log('apn dc') },
apnTimeout = function(){ console.log('apn timeout') },
apnTransmitted = function(notification, device){ console.log('apn send ok', device.toString('hex')) },
apnTransmissionError = function(errCode, notification, device){ console.log('apn send ko', errCode, device.toString('hex')) },
apnFeedback=function(feedback,sigslot){
    feedback.on('feedback', (items)=>{ // items = [{device, time}]
        sigslot.signal('webpush.feedback', SESSION_TYPE, items, 'apn')
    })
    feedback.on('feedbackError', console.error)
},
webpushCB=function(err, code, data){
	if (err) return console.error(err)
	if (data) console.log(data)
},
resolvePath=function(home, apnPath){
    return (path.isAbsolute(apnPath) ? apnPath : path.resolve(home, apnPath))
},
WebPush=function(config,sigslot){
	this.options=config.options
    if (config.apn){
        const apnCli=this.apnCli = new apn.Connection(config.apn)
        apnCli.on('connected', apnConnected)
        apnCli.on('disconnected', apnDisconnected)
        apnCli.on('timeout', apnTimeout)
        apnCli.on('transmitted', apnTransmitted)
        apnCli.on('transmissionError', apnTransmissionError)
        apnCli.on('socketError', console.error)

        // Setup a connection to the feedback service using a custom interval (10 seconds)
        apnFeedback(new apn.feedback(config.apn), sigslot)
    }
	if (config.gcm){
		this.gcm={
			url:config.gcm.endpoint,
			headers:{
				"Authorization": `key=${config.gcm.key}`,
				"Content-Type": "application/json"
			}
		}
	}
	if (config.moz){
		this.moz={
			url:config.moz.endpoint,
			headers:{
				"TTL": `${config.options.ttl}`,
			}
		}
	}
},
mozSend=function(url,opt,keys,i,res,cb){
	if (keys.length <=i) return cb()
	pUtil.ajax('post',url+keys[i],null,opt,(err,code,data)=>{
		if (err) return cb(err)
		res.push(data)
		mozSend(url,header,keys,++i,res,cb)
	})
}

WebPush.prototype={
	broadcast(tokens, ids, keys, title, content, urlargs){
        const
		options=this.options,
		cli=this.apnCli

        if (cli && tokens){
            const msg = new apn.Notification()

            msg.setAlertTitle(title)
            msg.setAlertText(content)
            msg.setAlertAction('view')
			msg.urlArgs=urlargs
            msg.truncateAtWordEnd=true
            msg.expiry = options.ttl ? (Date.now()/1000) + options.ttl : 0
            msg.trim()

			cli.pushNotification(msg, tokens)
        }

        if (ids){
			const gcm=this.gcm
			pUtil.ajax('post',gcm.url,JSON.stringify({registration_ids:ids}),gcm,webpushCB)
        }

        if (keys){
			const moz=this.moz
			mozSend(moz.url,moz,keys,0,[],webpushCB)
        }
	}
}

Session.addType(SESSION_TYPE, ['input','type'])

module.exports= {
    create(appConfig, libConfig, next){
        const config={
            // https://github.com/argon/node-apn/blob/master/doc/connection.markdown
            // https://github.com/argon/node-apn/blob/master/doc/feedback.markdown
            apn:{
                key:'apn_key.pem',
                cert:'apn_cert.pem',
                production:'pro'===appConfig.env?1:0,
                interval:3600
            },
            gcm:{
				endpoint:'https://android.googleapis.com/gcm/send',
                key:'YOUR_API_KEY_HERE'
            },
			moz:{
				endpoint:'https://updates.push.services.mozilla.com/wpush/v1/'
            },
			options:{
				ttl:0
			}
        }

        args.print('Webpush Options',pObj.extend(config,libConfig))

        const apn=config.apn

        apn.key=resolvePath(appConfig.path,apn.key)
        apn.cert=resolvePath(appConfig.path,apn.cert)

        return next(null, new WebPush(config,appConfig.sigslot))
    }
}
