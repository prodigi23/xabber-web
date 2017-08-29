define(["xabber-dependencies", "xabber-templates"], function (deps, templates) {
    var _ = deps._,
        $ = deps.$;

    var modal_queue = [];
 
    var Modal = function (modal_constructor, options) {
        if (modal_constructor instanceof Function) {
            this.$modal = $(modal_constructor());
        } else {
            this.$modal = $(modal_constructor);
        }
        this.options = options || {};
        this.closed = new $.Deferred();
    };
 
    _.extend(Modal.prototype, {
        open: function (options) {
            if (this.options.use_queue) {
                modal_queue.push(this);
                (modal_queue.length === 1) && this.throw();
            } else {
                this.throw();
            }
            return this.closed.promise();
        },

        throw: function () {
            this.$modal.appendTo('#modals').prop('modal', this);
            var modal_options = _.omit(this.options, ['use_queue']);
            _.extend(modal_options, {
                is_default_complete: true,
                complete_data: null
            });

            if (this.options.use_queue) {
                this.$modal.one('modal_close', function (ev, data) {
                    this.$modal.detach();
                    this.closed.resolve(data.value);
                    modal_queue.shift();
                    modal_queue.length && modal_queue[0].throw();
                }.bind(this));
            }

            this.$modal._openModal(modal_options);
        },

        close: function (options) {
            var modal_options = _.omit(options, ['use_queue', 'is_default_complete', 'complete_data']);
            _.extend(modal_options, {
                complete: function () {
                    if (this.options.use_queue) {
                        var data = _.isUndefined(options.complete_data) ? null : options.complete_data;
                        this.complete(data);
                    }
                    if (options.is_default_complete) {
                        if (typeof(this.options.complete) === "function") {
                            this.options.complete();
                        }
                    } else {
                        if (this.options.use_queue) {
                            this.complete();
                        }
                        if (typeof(options.complete) === "function") {
                            options.complete();
                        }
                    }
                }.bind(this)
            });

            this.$modal.prop('modal', null);
            this.$modal._closeModal(modal_options);
        },

        complete: function (value) {
            this.$modal.trigger('modal_close', {value: value});
        }
    });

    $.fn._openModal = $.fn.openModal;

    $.fn.openModal = function (options) {
        var modal = new Modal(this, options);
        return modal.open();
    };

    $.fn._closeModal = $.fn.closeModal;

    $.fn.closeModal = function (options) {
        var modal = this.prop('modal');
        if (modal) {
            modal.close(options);
        } else {
            this._closeModal(options);
        }
    };



    return {
        Modal: Modal,

        dialogs: {
            common: function (header, text, buttons) {
                var dialog = new Modal(function () {
                    buttons || (buttons = {});
                    var ok_button = buttons.ok_button,
                        cancel_button = buttons.cancel_button,
                        optional_buttons = (buttons.optional_buttons || []).reverse();
                    ok_button && (ok_button = {text: ok_button.text || 'Ok'});
                    cancel_button && (cancel_button = {text: cancel_button.text || 'Cancel'});
                    return templates.base.dialog({
                        header: header,
                        text: text,
                        ok_button: ok_button,
                        cancel_button: cancel_button,
                        optional_buttons: optional_buttons
                    });
                }, {use_queue: true});
                dialog.$modal.find('.modal-footer button').click(function (ev) {
                    dialog.close({complete_data: $(ev.target).data('option')});
                });
                return dialog.open();
            },

            error: function (text) {
                return this.common('Error', text, {ok_button: true});
            },

            ask: function (header, text) {
                return this.common(header, text, {ok_button: true, cancel_button: true});
            }
        }
    };
});