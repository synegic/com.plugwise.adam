'use strict';

const Homey = require('homey');

module.exports = class PlugwiseAdamDriver extends Homey.Driver {
	
	onPair( socket ) {
  	
  	let bridge;
  	let bridges;
  	let password;
  	
  	const onListDevices = ( data, callback ) => {
    	if( bridge ) return onListDevicesDevices( data, callback );
    	return onListDevicesBridges( data, callback );
  	}
  	
  	const onListDevicesBridges = ( data, callback ) => {
    	bridges = Homey.app.getBridges();
    	const devices = Object.values(bridges).map(bridge => {
      	return {
        	name: bridge.name,
        	data: {
          	id: bridge.id,
        	},        	
      	}
    	});
    	callback(null, devices);
  	}
  	
  	const onListDevicesDevices = ( data, callback ) => {
    	if(!bridge)
    	  return callback( new Error('Missing Bridge') );
    	  
      Promise.resolve()
        .then(async () => {
          const appliances = await bridge.getAppliances();
          const devices = appliances.filter(appliance => {
            return this.onPairFilterAppliance({ appliance });
          }).map(appliance => {
            return {
              name: appliance.name,
              data: {
                bridgeId: bridge.id,
                applianceId: appliance.$attr.id,
              },
              store: {
                password,
              }
            }
          });
          
          callback( null, devices );
        }).catch(callback)
  	}
  	
  	const onListBridgesSelection = ( data, callback ) => {
    	callback();
    	
    	const [ device ] = data;
    	const { id } = device.data;
    	
    	bridge = bridges[id];
  	}
  	
  	const onPincode = ( pincode, callback ) => {
    	if(!bridge)
    	  return callback( new Error('Missing Bridge') );
    
      password = pincode.join('');
      
      bridge.testPassword({ password })
        .then(result => {
          if( result === true )
            bridge.password = password;
          
          callback( null, result );
        }).catch(callback);
  	}
  	
  	socket.on('list_devices', onListDevices);
  	socket.on('list_bridges_selection', onListBridgesSelection);
  	socket.on('pincode', onPincode);
  	
	}
	
	onPairFilterAppliance({ appliance }) {
  	return false;
	}
	
}