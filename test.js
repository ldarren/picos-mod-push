const
pico=require('pico-common/pico-cli'),
ensure= pico.export('pico/test').ensure,
web=require('./web'),
device=require('./device')

let
webCli, deviceCli

ensure('ensure web loaded', function(cb){
	cb(null, !!web)
})
ensure('ensure device loaded', function(cb){
	cb(null, !!device)
})
ensure('ensure web create', function(cb){
	web.create({path:'',env:'pro'},{apn:{
		key:'node_modules/apn/test/credentials/support/certKey.pem',
		cert:'node_modules/apn/test/credentials/support/cert.pem'}},(err, cli)=>{
		if (err) return cb(err)
		webCli=cli
		cb(null, !!webCli)
	})
})
ensure('ensure device create', function(cb){
	device.create({path:'',env:'pro'},{apn:{
		key:'node_modules/apn/test/credentials/support/certKey.pem',
		cert:'node_modules/apn/test/credentials/support/cert.pem'}},(err, cli)=>{
		if (err) return cb(err)
		deviceCli=cli
		cb(null, !!deviceCli)
	})
})
