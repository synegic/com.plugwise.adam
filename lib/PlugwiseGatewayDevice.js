'use strict';

const Homey = require('homey');
const PlugwiseDevice = require('./PlugwiseDevice');

module.exports = class PlugwiseGatewayDevice extends PlugwiseDevice {

  onInit(...props) {
    super.onInit(...props);

    this.registerCapabilityListener('dhw_mode', this.onCapabilityDHWmode.bind(this));

    this._setDHWmodeAction = new Homey.FlowCardAction(`${this.driverId}:dhw_mode:set`).register()
        .registerRunListener(this._setDHWmodeRunListener.bind(this));

    this._boilerErrorCodeChangedTrigger = new Homey.FlowCardTriggerDevice(`${this.driverId}:boiler_error_code:changed`).register();

  }

  async _setDHWmodeRunListener(args) {
    if (!args.hasOwnProperty('mode'))
      throw new Error('mode_property_missing');

    return this.onCapabilityDHWmode(args.mode)
  }

  async onCapabilityDHWmode(value) {
    return this.bridge.setDHWmode({
      applianceId: this.applianceId,
      mode: value,
    });
  }

  onPoll({ appliance }) {
    // console.log(JSON.stringify(appliance.logs, false, 2));

    if( appliance.logs
        && Array.isArray(appliance.logs.point_log) ) {
      appliance.logs.point_log.forEach(log => {

        //modulation_level
        if( log.type === 'modulation_level'
            && log.period
            && log.period.measurement ) {
          const value = parseFloat(log.period.measurement.$text) * 100;
          this.setCapabilityValue('modulation_level', value).catch(this.error);
        }

        //boiler_state
        if( log.type === 'central_heating_state'
            && log.period
            && log.period.measurement ) {
          const state = log.period.measurement.$text;
          this.setCapabilityValue('boiler_state', state === 'on').catch(this.error);
        }

        //measure_pressure
        if (this.hasCapability('measure_pressure')
            && log.type === 'central_heater_water_pressure'
            && log.unit === 'bar'
            && log.period
            && log.period.measurement) {
          const value = (parseFloat(log.period.measurement.$text) * 1000) || null;
          if (this.getCapabilityValue('measure_pressure') !== value) {
            this.setCapabilityValue('measure_pressure', value).catch(this.error);
          }
        }

        //measure_temperature.target
        if( log.type === 'intended_boiler_temperature'
            && log.unit === 'C'
            && log.period
            && log.period.measurement ) {
          const value = Math.round(parseFloat(log.period.measurement.$text)* 10) / 10;
          if ( this.getCapabilityValue('measure_temperature.target')!== value ) {
            this.setCapabilityValue('measure_temperature.target', value).catch(this.error);
          }
        }

        //measure_temperature.output
        if( log.type === 'boiler_temperature'
            && log.unit === 'C'
            && log.period
            && log.period.measurement ) {
          const value = Math.round(parseFloat(log.period.measurement.$text)* 10) / 10;
          if (this.getCapabilityValue('measure_temperature.output')!== value ) {
            this.setCapabilityValue('measure_temperature.output', value).catch(this.error);
          }
        }

        //measure_temperature.return
        if( log.type === 'return_water_temperature'
            && log.unit === 'C'
            && log.period
            && log.period.measurement ) {
          const value = Math.round(parseFloat(log.period.measurement.$text)* 10) / 10;
          if (this.getCapabilityValue('measure_temperature.return')!== value ) {
            this.setCapabilityValue('measure_temperature.return', value).catch(this.error);
          }
        }

        //measure_temperature.outdoor
        if( log.type === 'outdoor_temperature'
            && log.unit === 'C'
            && log.period
            && log.period.measurement ) {
          const value = Math.round(parseFloat(log.period.measurement.$text)* 10) / 10;
          if (this.getCapabilityValue('measure_temperature.outdoor')!== value ) {
            this.setCapabilityValue('measure_temperature.outdoor', value).catch(this.error);
          }
        }

        //boiler_status_code
        if( log.type === 'open_therm_application_specific_fault_code'
            && log.period
            && log.period.measurement ) {
          const code = parseFloat(log.period.measurement.$text);
          if (this.getCapabilityValue('boiler_error_code') !== code) {
            this.setCapabilityValue('boiler_status_code', code).catch(this.error);
          }
        }

        //boiler_error_code
        if( log.type === 'open_therm_oem_fault_code'
            && log.period
            && log.period.measurement ) {
          const code = parseFloat(log.period.measurement.$text);
          if (this.getCapabilityValue('boiler_error_code') !== code) {
            this.setCapabilityValue('boiler_error_code', code).catch(this.error);

            if (this._boilerErrorCodeChangedTrigger)
              this._boilerErrorCodeChangedTrigger
                .trigger(this, { code })
                .catch(this.error)
          }
        }

        //dhw_mode
        if( log.type === 'domestic_hot_water_comfort_mode'
            && log.period
            && log.period.measurement ) {
          const state = log.period.measurement.$text;
          if (this.getCapabilityValue('dhw_mode') !== state) {
            this.setCapabilityValue('dhw_mode', state).catch(this.error);
          }
        }

        //dhw_state
        if(this.hasCapability('dhw_state')
            && log.type === 'domestic_hot_water_state'
            && log.period
            && log.period.measurement ) {
          const state = log.period.measurement.$text === 'on';
          if (this.getCapabilityValue('dhw_state') !== state) {
            this.setCapabilityValue('dhw_state', state).catch(this.error);
          }
        }

      });
    }
  }
  	
};