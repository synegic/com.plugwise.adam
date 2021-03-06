'use strict';

const Homey = require('homey');
const PlugwiseDevice = require('./PlugwiseDevice');

module.exports = class PlugwiseGatewayDevice extends PlugwiseDevice {

  onInit(...props) {
    super.onInit(...props);

    if (this.hasCapability('DHW_mode')) {
        this.registerCapabilityListener('DHW_mode', this.onCapabilityDHWmode.bind(this));

        this._setDHWmodeAction = new Homey.FlowCardAction('Set_DHW_mode').register()
            .registerRunListener(this._setDHWmodeRunListener.bind(this));
    }

    if (this.hasCapability('boiler_error_code')) {
        this._boilerErrorCodeChangedTrigger = new Homey.FlowCardTriggerDevice('boiler_error_code:changed').register();
    }
  }

  async _setDHWmodeRunListener(args) {
    if (!args.hasOwnProperty('mode'))
      throw new Error('mode_property_missing');

    return this.onCapabilityDHWmode(args.mode, args.device)
  }

  async onCapabilityDHWmode(value, device) {

    let applianceId = this.applianceId;

    if (device && device.hasOwnProperty('applianceId')) {
      applianceId = device.applianceId;
    }

    return this.bridge.setDHWmode({
      applianceId: applianceId,
      mode: value,
    });
  }

  onPoll({ appliance }) {
    // console.log(JSON.stringify(appliance.logs, false, 2));

    if (appliance && appliance.logs
        && Array.isArray(appliance.logs.point_log)) {
        appliance.logs.point_log.forEach(log => {
            //modulation_level
            if (this.hasCapability('modulation_level')
                && log.type === 'modulation_level'
                && log.period
                && log.period.measurement) {
                const value = parseFloat(log.period.measurement.$text) * 100;
                this.setCapabilityValue('modulation_level', value).catch(this.error);
            }

            //boiler_state
            if (this.hasCapability('boiler_state')
                && log.type === 'central_heating_state'
                && log.period
                && log.period.measurement) {
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

            //measure_temperature.intended
            if (this.hasCapability('measure_temperature.boiler')
                && log.type === 'intended_boiler_temperature'
                && log.unit === 'C'
                && log.period
                && log.period.measurement) {
                const value = Math.round(parseFloat(log.period.measurement.$text) * 10) / 10;
                if (this.getCapabilityValue('measure_temperature.intended') !== value) {
                    this.setCapabilityValue('measure_temperature.intended', value).catch(this.error);
                }
            }

            //measure_temperature.boiler
            if (this.hasCapability('measure_temperature.boiler')
                && log.type === 'boiler_temperature'
                && log.unit === 'C'
                && log.period
                && log.period.measurement) {
                const value = Math.round(parseFloat(log.period.measurement.$text) * 10) / 10;
                if (this.getCapabilityValue('measure_temperature.boiler') !== value) {
                    this.setCapabilityValue('measure_temperature.boiler', value).catch(this.error);
                }
            }

            //measure_temperature.return
            if (this.hasCapability('measure_temperature.return')
                && log.type === 'return_water_temperature'
                && log.unit === 'C'
                && log.period
                && log.period.measurement) {
                const value = Math.round(parseFloat(log.period.measurement.$text) * 10) / 10;
                if (this.getCapabilityValue('measure_temperature.return') !== value) {
                    this.setCapabilityValue('measure_temperature.return', value).catch(this.error);
                }
            }

            //measure_temperature.outdoor
            //this can be from either a sensor (if available) or weather service
            if (this.hasCapability('measure_temperature.outdoor')
                && log.type === 'outdoor_temperature'
                && log.unit === 'C'
                && log.period
                && log.period.measurement) {
                const value = Math.round(parseFloat(log.period.measurement.$text) * 10) / 10;
                if (this.getCapabilityValue('measure_temperature.outdoor') !== value) {
                    this.setCapabilityValue('measure_temperature.outdoor', value).catch(this.error);
                }
            }

            //boiler_status_code
            if (this.hasCapability('boiler_status_code')
                && log.type === 'open_therm_application_specific_fault_code'
                && log.period
                && log.period.measurement) {
                const code = parseFloat(log.period.measurement.$text);
                if (this.getCapabilityValue('boiler_error_code') !== code) {
                    this.setCapabilityValue('boiler_status_code', code).catch(this.error);
                }
            }

            //boiler_error_code
            if (this.hasCapability('boiler_error_code')
                && log.type === 'open_therm_oem_fault_code'
                && log.period
                && log.period.measurement) {
                const code = parseFloat(log.period.measurement.$text);
                if (this.getCapabilityValue('boiler_error_code') !== code) {
                    this.setCapabilityValue('boiler_error_code', code).catch(this.error);

                    if (this._boilerErrorCodeChangedTrigger)
                        this._boilerErrorCodeChangedTrigger
                            .trigger(this, {code})
                            .catch(this.error)
                }
            }

            //DHW_mode
            if (this.hasCapability('DHW_mode')
                && log.type === 'domestic_hot_water_comfort_mode'
                && log.period
                && log.period.measurement) {
                const state = log.period.measurement.$text;
                if (this.getCapabilityValue('DHW_mode') !== state) {
                    this.setCapabilityValue('DHW_mode', state).catch(this.error);
                }
            }

            //DHW_state
            if (this.hasCapability('DHW_state')
                && log.type === 'domestic_hot_water_state'
                && log.period
                && log.period.measurement) {
                const state = log.period.measurement.$text === 'on';
                if (this.getCapabilityValue('DHW_state') !== state) {
                    this.setCapabilityValue('DHW_state', state).catch(this.error);
                }
            }
        });
    }
  }
  	
};