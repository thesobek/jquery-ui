/*
 * jQuery UI Spinner @VERSION
 *
 * Copyright 2011, AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 *
 * http://docs.jquery.com/UI/Spinner
 *
 * Depends:
 *  jquery.ui.core.js
 *  jquery.ui.widget.js
 */
(function( $ ) {

$.widget( "ui.spinner", {
	version: "@VERSION",
	defaultElement: "<input>",
	widgetEventPrefix: "spin",
	options: {
		incremental: true,
		max: null,
		min: null,
		numberFormat: null,
		page: 10,
		step: null,
		value: null
	},

	_create: function() {
		this._draw();
		this._markupOptions();
		this._mousewheel();
		this._aria();
	},

	_markupOptions: function() {
		var that = this;
		$.each({
			min: -Number.MAX_VALUE,
			max: Number.MAX_VALUE,
			step: 1
		}, function( attr, defaultValue ) {
			if ( that.options[ attr ] === null ) {
				var value = that.element.attr( attr );
				that.options[ attr ] = typeof value === "string" && value.length > 0 ?
					that._parse( value ) :
					defaultValue;
			}
		});
		this.value( this.options.value !== null ? this.options.value : this.element.val() || 0 );
	},

	_draw: function() {
		var uiSpinner = this.uiSpinner = this.element
			.addClass( "ui-spinner-input" )
			.attr( "autocomplete", "off" )
			.wrap( this._uiSpinnerHtml() )
			.parent()
				// add buttons
				.append( this._buttonHtml() )
				// add behaviors
				.disableSelection();
		this._hoverable( uiSpinner );

		this.element.attr( "role", "spinbutton" );
		this._bind({
			keydown: function( event ) {
				if ( this._start( event ) ) {
					// TODO: don't stop propagation
					return this._keydown( event );
				}
			},
			keyup: function( event ) {
				if ( this.spinning ) {
					this._stop( event );
					this._change( event );
				}
			},
			focus: function() {
				uiSpinner.addClass( "ui-state-active" );
			},
			blur: function( event ) {
				this.value( this.element.val() );
				// TODO: is this really correct or just the simplest
				// way to keep the active class when pressing the buttons?
				// if the mosue is over the text field and the user tabs out
				// shouldn't the active class get removed?
				if ( !uiSpinner.hasClass( "ui-state-hover" ) ) {
					uiSpinner.removeClass( "ui-state-active" );
				}
			}
		});

		// button bindings
		this.buttons = uiSpinner.find( ".ui-spinner-button" )
			.attr( "tabIndex", -1 )
			.button()
			.removeClass( "ui-corner-all" );
		this._bind( this.buttons, {
			mousedown: function( event ) {
				if ( this._start( event ) === false ) {
					// TODO: do we really want to stop propagation?
					return false;
				}
				this._repeat( null, $( event.currentTarget ).hasClass( "ui-spinner-up" ) ? 1 : -1, event );
			},
			mouseup: function( event ) {
				if ( this.spinning ) {
					this._stop( event );
					this._change( event );
				}
			},
			mouseenter: function( event ) {
				// button will add ui-state-active if mouse was down while mouseleave and kept down
				if ( !$( event.currentTarget ).hasClass( "ui-state-active" ) ) {
					return;
				}

				if ( this._start( event ) === false ) {
					return false;
				}
				this._repeat( null, $( event.currentTarget ).hasClass( "ui-spinner-up" ) ? 1 : -1, event );
			},
			// TODO: we shouldn't trigger any events until mouseup
			mouseleave: function() {
				if ( this.spinning ) {
					this._stop( event );
					this._change( event );
				}
			}
		});

		// disable spinner if element was already disabled
		if ( this.options.disabled ) {
			this.disable();
		}
	},

	_keydown: function( event ) {
		var options = this.options,
			keyCode = $.ui.keyCode;

		switch ( event.keyCode ) {
		case keyCode.UP:
			this._repeat( null, 1, event );
			return false;
		case keyCode.DOWN:
			this._repeat( null, -1, event );
			return false;
		case keyCode.PAGE_UP:
			this._repeat( null, options.page, event );
			return false;
		case keyCode.PAGE_DOWN:
			this._repeat( null, -options.page, event );
			return false;
		case keyCode.ENTER:
			this.value( this.element.val() );
		}

		return true;
	},

	_mousewheel: function() {
		// need the delta normalization that mousewheel plugin provides
		if ( !$.fn.mousewheel ) {
			return;
		}
		this._bind({
			mousewheel: function( event, delta ) {
				if ( !delta ) {
					return;
				}
				if ( !this.spinning && !this._start( event ) ) {
					return false;
				}

				this._spin( (delta > 0 ? 1 : -1) * this.options.step, event );
				clearTimeout( this.timeout );
				this.timeout = setTimeout(function() {
					if ( this.spinning ) {
						this._stop( event );
						this._change( event );
					}
				}, 100 );
				event.preventDefault();
			}
		});
	},

	_uiSpinnerHtml: function() {
		return "<span class='ui-spinner ui-state-default ui-widget ui-widget-content ui-corner-all'></span>";
	},

	_buttonHtml: function() {
		return "" +
			"<a class='ui-spinner-button ui-spinner-up ui-corner-tr'>" +
				"<span class='ui-icon ui-icon-triangle-1-n'>&#9650;</span>" +
			"</a>" +
			"<a class='ui-spinner-button ui-spinner-down ui-corner-br'>" +
				"<span class='ui-icon ui-icon-triangle-1-s'>&#9660;</span>" +
			"</a>";
	},

	_start: function( event ) {
		if ( !this.spinning && this._trigger( "start", event ) === false ) {
			return false;
		}

		if ( !this.counter ) {
			this.counter = 1;
		}
		this.spinning = true;
		return true;
	},

	_repeat: function( i, steps, event ) {
		var that = this;
		i = i || 500;

		clearTimeout( this.timer );
		this.timer = setTimeout(function() {
			that._repeat( 40, steps, event );
		}, i );

		this._spin( steps * this.options.step, event );
	},

	_spin: function( step, event ) {
		if ( !this.counter ) {
			this.counter = 1;
		}

		// TODO refactor, maybe figure out some non-linear math
		var newVal = this.value() + step * (this.options.incremental &&
			this.counter > 20
				? this.counter > 100
					? this.counter > 200
						? 100
						: 10
					: 2
				: 1);

		// clamp the new value 
		newVal = this._trimValue( newVal );

		if ( this._trigger( "spin", event, { value: newVal } ) !== false) {
			this.value( newVal );
			this.counter++;
		}
	},

	_trimValue: function( value ) {
		var options = this.options;

		if ( value > options.max) {
			return options.max;
		}

		if ( value < options.min ) {
			return options.min;
		}

		return value;
	},

	_stop: function( event ) {
		clearTimeout( this.timer );
		this.counter = 0;
		this.element.focus();
		this.spinning = false;
		this._trigger( "stop", event );
	},

	_change: function( event ) {
		this._trigger( "change", event );
	},

	_setOption: function( key, value ) {
		if ( key === "value") {
			value = this._trimValue( this._parse(value) );
		}

		if ( key === "disabled" ) {
			if ( value ) {
				this.element.prop( "disabled", true );
				this.buttons.button( "disable" );
			} else {
				this.element.prop( "disabled", false );
				this.buttons.button( "enable" );
			}
		}

		this._super( "_setOption", key, value );
	},

	_setOptions: function( options ) {
		this._super( "_setOptions", options );
		if ( "value" in options ) {
			this._format( this.options.value );
		}
		this._aria();
	},

	_aria: function() {
		this.element.attr({
			"aria-valuemin": this.options.min,
			"aria-valuemax": this.options.max,
			"aria-valuenow": this.options.value
		});
	},

	_parse: function( val ) {
		if ( typeof val === "string" ) {
			val = $.global && this.options.numberFormat ? $.global.parseFloat( val ) : +val;
		}
		return isNaN( val ) ? null : val;
	},

	_format: function( num ) {
		this.element.val( $.global && this.options.numberFormat ? $.global.format( num, this.options.numberFormat ) : num );
	},

	destroy: function() {
		this.element
			.removeClass( "ui-spinner-input" )
			.prop( "disabled", false )
			.removeAttr( "autocomplete" )
			.removeAttr( "role" )
			.removeAttr( "aria-valuemin" )
			.removeAttr( "aria-valuemax" )
			.removeAttr( "aria-valuenow" );
		this._super( "destroy" );
		this.uiSpinner.replaceWith( this.element );
	},

	stepUp: function( steps ) {
		this._spin( (steps || 1) * this.options.step );
	},

	stepDown: function( steps ) {
		this._spin( (steps || 1) * -this.options.step );
	},

	pageUp: function( pages ) {
		this.stepUp( (pages || 1) * this.options.page );
	},

	pageDown: function( pages ) {
		this.stepDown( (pages || 1) * this.options.page );
	},

	value: function( newVal ) {
		if ( !arguments.length ) {
			return this._parse( this.element.val() );
		}
		this.option( "value", newVal );
	},

	widget: function() {
		return this.uiSpinner;
	}
});

}( jQuery ) );