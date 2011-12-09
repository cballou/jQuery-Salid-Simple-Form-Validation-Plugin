/**
 * jQuery Salid (Simple Validation) Plugin 1.0.0
 *
 * http://www.jqueryin.com/projects/salid-the-simple-jquery-form-validator/
 * http://plugins.jquery.com/project/Salid
 *
 * Copyright (c) 2009 Corey Ballou
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
(function($) {
	var hasErrors = { salid: false, salidate: false }
	var errors = { salid: [], salidate: [] };

	/* validate entire form */
	$.fn.salidate = function(elemsToValidate, errorCallback, successCallback) {
		var $form = $(this);
		if (!$form.is('form')) {
			_log('The salidate function only works with forms.');
			return false;
		}
		if (elemsToValidate == 'cancel' || elemsToValidate == 'unbind') {
			$form.die('submit.salidate');
			return false;
		}
		if (typeof errorCallback != 'function') errorCallback = salid_errorHandler;
		$form.live('submit.salidate', function(e) {
			$.each(elemsToValidate, function(field, params) {
				validate(field, params, $form, 'salidate');
			});
			if (hasErrors['salidate']) {
				e.preventDefault();
				e.stopImmediatePropagation();
				handleErrors(errorCallback, $form, 'salidate');
				return false;
			} else if (typeof successCallback === 'function') {
				return successCallback.call(this);
			}
			return true;
		});
	}

	/* validate individual elements */
	$.fn.salid = function(event, params, errorCallback) {
		var tagname = this.get(0).tagName.toLowerCase();
		var validElems = {
			input: ['blur','keydown','keyup'],
			select: ['change','blur'],
			textarea: ['blur','focus','keydown','keyup']
		};
		if (typeof validElems[tagname] == 'undefined') {
			_log(escape(tagname) + ' cannot be used to for singular validation.');
			return false;
		}
		event = event || 'blur';
		if (!$.inArray(validElems[tagname], event)) {
			_log('You cannot bind the event ' + escape(event) + ' to the tag ' + escape(tagname));
			return false;
		}
		if (typeof errorCallback != 'function') errorCallback = salid_errorHandler;
		if (typeof params == 'String' && (params == 'cancel' || params == 'unbind')) {
			this.each(function() { $(this).die(event + '.salid'); });
			return false;
		}
		if (typeof params == 'undefined') params = {};
		this.each(function() {
			var $this = $(this);
			$this.bind(event + '.salid', function() {
				if (!validate($this, params, null, 'salid')) {
					handleErrors(errorCallback, $this, 'salid');
				}
			});
		});
	}

	/* handle validation type */
	function validate(field, params, $form, ns) {
		var valid = true;
		if (typeof params.callbacks != 'undefined' && params.callbacks.constructor == Array) {
			$.each(params.callbacks, function(idx, rule) {
				if (!_validate(field, rule, $form, ns)) valid = false;
			});
			return valid;
		} else return _validate(field, params, $form, ns);
	}

	/* run a validation function */
	function _validate(field, params, $form, ns) {
		var fcn, $field, rules, independent = false;
		var obj = (function() { return this; })();
		var defaults = { callback : 'required', callbackParams : null, msg : 'This field is required' };
		if (field instanceof jQuery) {
			independent = true;
			$field = field;
			field = field.attr('id') || field.attr('name');
		} else $field = getElem($form, field);
		// skip disabled fields
		if ($field.attr('disabled') == false) {
			// remove any old pre-existing errors
			if ($field.is(':radio') || $field.is(':checkbox')) {
				$field.parent('label').removeClass('error').next('span.error').remove();
			} else {
				$field.removeClass('error').parent().find('span.error').remove();
			}
			rules = $.extend({}, defaults, params);
			rules = $.metadata ? $.extend({}, rules, $field.metadata()) : rules;
			fcn = 'salid_' + rules.callback;
			if (typeof obj[fcn] != 'function') {
				_log('It does not appear as though the validation function ' + fcn + ' exists.');
				return false;
			}
			if (!obj[fcn]($field, rules.callbackParams)) {
				addError(field, $field, rules.msg, ns);
				hasErrors[ns] = true;
				return false;
			}
		}
		return true;
	}

	/* add an error */
	function addError(field, $field, msg, ns) {
		var fixed = field.replace(/\[/i, 'OB');
		fixed = fixed.replace(/\]/i, 'CB');
		if (ns == 'salid') {
			if (!errors[ns][fixed]) errors[ns][fixed] = [];
			errors[ns][fixed][errors[ns][fixed].length] = { elem: $field, field: field, msg: msg };
		} else errors[ns][errors[ns].length] = { elem: $field, field: field, msg: msg };
	}

	/* handle errors by calling a callback function */
	function handleErrors(errorCallback, $elem, ns) {
		var e, field, l;
		if (ns == 'salid') {
			field = $elem.attr('id') || $elem.attr('name');
			var fixed = field.replace(/\[/i, 'OB');
			fixed = fixed.replace(/\]/i, 'CB');
			l = errors[ns][fixed].length;
			while (l--) {
				e = errors[ns][fixed][l];
				$(e.elem).addClass('error');
			}
			errorCallback($elem, errors[ns][fixed]);
		} else {
			l = errors[ns].length;
			while(l--) { e = errors[ns][l]; $(e.elem).addClass('error') }
			errorCallback($elem, errors[ns]);
		}
		hasErrors[ns] = false;
		errors[ns] = [];
		return false;
	}

	/* Attempt to find the form element by id with fallback on name. */
	function getElem($elem, field) {
		if ($elem.get(0).tagName.toLowerCase() != 'form') return $elem;
		if (field instanceof jQuery) return field;
		field = field.replace(/(\[(.*)?\])/, '');
		var $found = $elem.find("#"+field);
		if ($found.length == 0) $found = $elem.find("*[name^='"+field+"']");
		return $found;
	}

	/* logs messages to console */
	function _log(msg) { window.console ? console.log(msg) : alert(msg); }

})(jQuery);

/* default error handler popup */
function salid_errorHandler($elem, errors) {
	var isformelem, $e, e, l = errors.length;
	isformelem = $elem.get(0).tagName.toLowerCase() != 'form';
	while(l--) {
		e = errors[l];
		$e = $(e.elem);
		if ($e.is(':radio') || $(e).is(':checkbox')) {
			if ($e.hasClass('ui-helper-hidden-accessible')) {
				$e.parent().addClass('error').after('<span class="error"><span>' + e.msg + '</span></span>');
			} else {
				$e.parent('label').addClass('error').after('<span class="error"><span>' + e.msg + '</span></span>');
			}
		} else {
			$e.addClass('error').parent().append('<span class="error"><span>' + e.msg + '</span></span>');
		}
	}
	return false;
}

/* required */
function salid_required(field, params) {
	if (field.length == 0 || typeof field == 'undefined') return false;
	if (/radio|checkbox/i.test(field[0].type)) return (field.filter(':checked').length > 0);
	return (field.length > 0 && field.val() != '');
}
/* minlength */
function salid_minlength(field, params) {
	return (!salid_required(field, params) || field.val().length >= params);
}
/* maxlength */
function salid_maxlength(field, params) {
	return (!salid_required(field, params) || field.val().length <= params);
}
/* between */
function salid_between(field, params) {
	var l = field.val().length;
	return (!salid_required(field, params) || (l >= params[0] && l <= params[1]));
}
/* email */
function salid_email(field, params) {
	return (!salid_required(field, params) || /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(field.val()));
}
/* phone */
function salid_phone(field, params) {
	var filter = /(\+\d)*\s*(\(\d{3}\)\s*)*\d{3}(-{0,1}|\s{0,1})\d{2}(-{0,1}|\s{0,1})\d{2}/;
	return (!salid_required(field, params) || filter.test(field.val()));
}
/* url */
function salid_url(field, params) {
	return (!salid_required(field, params) || /(https?|s?ftp):\/\//i.test(field.val()));
}
/* zipcode */
function salid_zipcode(field, params) {
	return (!salid_required(field, params) || /(^\d{5}(-\d{4})?)$/.test(field.val()));
}
/* alpha */
function salid_alpha(field, params) {
	return (!salid_required(field, params) || /^[A-Za-z]+$/.test(field.val()));
}
/* numeric */
function salid_numeric(field, params) {
	return (!salid_required(field, params) || /^[\d]+$/.test(field.val()));
}
/* alpha-numeric */
function salid_alphanumeric(field, params) {
	return (!salid_required(field, params) || /^[A-Za-z0-9]+$/i.test(field.val()));
}
/* alpha-dash (alpha-numeric with dashes and underscores allowed). */
function salid_alphadash(field, params) {
	return (!salid_required(field, params) || /^[A-Za-z0-9-_]+$/i.test(field.val()));
}
/* matching values */
function salid_match(field, params) {
	if (typeof field == 'undefined') return false;
	var field2 = field.siblings('#' + params);
	if (field2.length == 0) field2 = field.siblings("*[name^='"+params+"']");
	if (field2.length == 0) field2 = field.closest('form').find('#' + params);
	if (field2.length == 0) field2 = field.closest('form').find("*[name^='"+params+"']");
	if (field2.length == 0) return false;
	return (field.val() == field2.val());
}
/* credit card validation */
function salid_creditcard(field, params) {
    if (!salid_required(field, params)) return true;
    var value = field.val();
	if (/[^0-9-]+/.test(value)) return false;
	var nCheck = 0, nDigit = 0, bEven = false;
	value = value.replace(/\D-/g, "");
	for (var n = value.length - 1; n >= 0; n--) {
		var cDigit = value.charAt(n);
		var nDigit = parseInt(cDigit, 10);
		if (bEven) {
			if ((nDigit *= 2) > 9) {
				nDigit -= 9;
			}
		}
		nCheck += nDigit;
		bEven = !bEven;
	}
	return (nCheck % 10) == 0;
}
