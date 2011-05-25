/*
   jquery.keyboard.js

   Copyright (c) 2011 Ken Rockot <ken-s/(-[^-]*){4}-/@/-oz.gs>
   All rights reserved.

   Everyone is permitted to copy and distribute verbatim or modified copies
   of this software in source or binary form.

   This simple jQuery plugin provides a keyboard function, allowing you to
   painlessly trap arbitrary keystrokes in the browser without having to
   think about the crippling inconsistencies that appear from browser to
   browser.

   Unlike js-hotkeys this does not allow the caller to set up specific hotkey
   handlers, but instead enables the registration of a single global keypress
   handler that takes a consistent, well-defined event argument.

   Example:

   $(document).ready(function() {
    // The counter illustrates sane key-repeat handling without dupes.
    var counter = {}
    $(document).keyboard(function(e) {
       var keyname = e.chr;
       if(keyname == null)
           keyname = $.KeyNames[e.key];
       if(e.shift) keyname = "S-" + keyname;
       if(e.alt) keyname = "A-" + keyname;
       if(e.ctrl) keyname = "C-" + keyname;
       if(!(keyname in counter)) { counter = {}; counter[keyname] = 1; }
       else ++counter[keyname];
           $('body').html("You pressed: " + keyname + "(" + counter[keyname] + " times)");
    });
   });

   Pretty much everything that this plugin can do is demonstrated by this example.
   Additionally, a $.Keys object is defined to allow for mindless testing of
   common key code (e.key) values.  These definitions depend at least in part on
   keyboard layout, so YMMV.  Many common keys like $.Keys.Enter, $.Keys.Escape,
   $.Keys.Space, and $.Keys.Tab should be safe to rely upon.

   Of note is that for any given keystroke or key combination, you can expect EXACTLY
   the same event content in a Webkit, Gecko, or even Opera* browser.

   Specifically, here are the semantics of a keyboard event e:

    - You always get a valid key code in e.key; it usually has an entry in $.KeyNames
      and is comparable to a named entry in $.Keys (i.e., you can test
      e.key == $.Keys.Escape).
    - You get a character representation of the keystroke in e.chr if and only if
      neither Ctrl or Alt is pressed, the keystroke has a character representation,
      AND the key is NOT $.Keys.Space, $.Keys.Enter, or $.Keys.Tab.
    - If a sane and valid character representation is not in e.chr, e.chr is
      guaranteed to be null.
    - e.chr is affected by the shift modifier.  An event with e.key == $.Keys.Key0
      and e.shift == true will hold e.chr == ')'.
    - e.alt, e.ctrl, and e.shift are always accurate.
    - Most keys and key combinations will fire repeated keyboard events when held
      down.*

   * Opera still does some funky things that are unavoiable, but they should almost
   never be a concern.  Numeric keypad events are treated as normal numeric key
   events when Num Lock is on (when off, they behave normally, as Home, End, etc.)
   Unlike Gecko and Webkit, Ctrl, Alt, and Shift keystrokes themselves do not repeat,
   but combinations they modify (e.g. Ctrl+D) repeat.

   Some browsers will process keystrokes even if you trap them, and there is nothing
   that can be done about that.  Try to use things that won't bubble to the browser.

   Finally, this plugin has been tested with a standard US-layout PC keyboard in the
   following environments:

     - Windows 7
       - IE 8
       - Firefox 4.0.1
       - Chrome 11.0.696.68 and 13.0.774.0
       - Opera 11.11

     - Ubuntu 10.10, Debian squeeze and wheezy
       - Various recent versions of Chrome
       - Firefox 4.0.1

     - Whatever browser is on my old Palm Pre (it works!)

   Perhaps most importantly missing from this list are Safari and anything else running
   under OS X, as well as browsers on various popular mobile devices.  International
   keyboards could also use some testing, though they should not present any significant
   inconsistencies.
*/

(function($) {
     // Some helpful keycodes, at least for US-layout keyboards.
     $.Keys = {
        Break:          3,
        Backspace:      8,
        Tab:            9,
        FormFeed:       12,
        Enter:          13,
        Shift:          16,
        Control:        17,
        Alt:            18,
        Pause:          19,
        CapsLock:       20,
        Escape:         27,
        Space:          32,
        PageUp:         33,
        PageDown:       34,
        End:            35,
        Home:           36,
        LeftArrow:      37,
        UpArrow:        38,
        RightArrow:     39,
        DownArrow:      40,
        Insert:         45,
        Delete:         46,
        Key0:           48,
        Key1:           49,
        Key2:           50,
        Key3:           51,
        Key4:           52,
        Key5:           53,
        Key6:           54,
        Key7:           55,
        Key8:           56,
        Key9:           57,
        KeyA:           65,
        KeyB:           66,
        KeyC:           67,
        KeyD:           68,
        KeyE:           69,
        KeyF:           70,
        KeyG:           71,
        KeyH:           72,
        KeyI:           73,
        KeyJ:           74,
        KeyK:           75,
        KeyL:           76,
        KeyM:           77,
        KeyN:           78,
        KeyO:           79,
        KeyP:           80,
        KeyQ:           81,
        KeyR:           82,
        KeyS:           83,
        KeyT:           84,
        KeyU:           85,
        KeyV:           86,
        KeyW:           87,
        KeyX:           88,
        KeyY:           89,
        KeyZ:           90,
        NumPad0:        96,
        NumPad1:        97,
        NumPad2:        98,
        NumPad3:        99,
        NumPad4:        100,
        NumPad5:        101,
        NumPad6:        102,
        NumPad7:        103,
        NumPad8:        104,
        NumPad9:        105,
        NumPadTimes:    106,
        NumPadPlus:     107,
        NumPadMinus:    109,
        NumPadDecimal:  110,
        NumPadDivide:   111,
        F1:             112,
        F2:             113,
        F3:             114,
        F4:             115,
        F5:             116,
        F6:             117,
        F7:             118,
        F8:             119,
        F9:             120,
        F10:            121,
        F11:            122,
        F12:            123,
        NumLock:        144,
        ScrollLock:     145,
        Semicolon:      186,
        Equals:         187,
        Comma:          188,
        Minus:          189,
        Period:         190,
        Slash:          191,
        Grave:          192,
        LeftBracket:    219,
        Backslash:      220,
        RightBracket:   221,
        Quote:          222
    };

    // For convenience, a reverse-map of Keys
    $.KeyNames = {};
    for(var key in $.Keys)
        $.KeyNames[$.Keys[key]] = key;

    var Keys = $.Keys;
    var keyboard = {
        fn: function(e) {
            return false;
        },
        lastKeydown: {},
        keydownSent: false,
        firstKeypress: false
    }

    $.fn.keyboard = function(fn) {
        keyboard.fn = fn;
        this.keydown(keyboard.onKeydown);
        this.keypress(keyboard.onKeypress);
    }

    // Keydown events are only propagated to the handler if
    // Ctrl or Alt modifiers are pressed, or if the actual keystroke
    // is a special key.  Otherwise the keypress handler is used.
    // This works on the assumption (established through empirical
    // data) that keydown always fires first in cases where a keystroke
    // generates both a keydown and keypress event.
    keyboard.onKeydown = function(event) {
        var e = {
            ctrl: event.ctrlKey,
            shift: event.shiftKey,
            alt: event.altKey,
            key: event.keyCode,
            chr: null
        };
        keyboard.lastKeydown = e;
        keyboard.firstKeypress = true;
        if(e.ctrl || e.alt) {
            keyboard.keydownSent = true;
            return keyboard.fn(e);
        }
        switch(e.key) {
            case Keys.Control:
            case Keys.Alt:
            case Keys.Shift:
            case Keys.FormFeed:
            case Keys.Tab:
            case Keys.Backspace:
            case Keys.CapsLock:
            case Keys.NumLock:
            case Keys.ScrollLock:
            case Keys.Escape:
            case Keys.Home:
            case Keys.End:
            case Keys.PageUp:
            case Keys.PageDown:
            case Keys.Insert:
            case Keys.Delete:
            case Keys.F1:
            case Keys.F2:
            case Keys.F3:
            case Keys.F4:
            case Keys.F5:
            case Keys.F6:
            case Keys.F7:
            case Keys.F8:
            case Keys.F9:
            case Keys.F10:
            case Keys.F11:
            case Keys.F12:
            case Keys.LeftArrow:
            case Keys.UpArrow:
            case Keys.RightArrow:
            case Keys.DownArrow:
            case Keys.Break:
            case Keys.Pause:
            case Keys.Enter:
            case Keys.Space:
                keyboard.keydownSent = true;
                return keyboard.fn(e);
            default:
                keyboard.keydownSent = false;
                return true;
        }
    }

    keyboard.onKeypress = function(event) {
        var e = {
            ctrl: event.ctrlKey,
            shift: event.shiftKey,
            alt: event.altKey,
            key: event.keyCode,
            chr: null
        };

        // Do not re-send a keystroke that's already been sent by onKeydown
        var first = keyboard.firstKeypress;
        keyboard.firstKeypress = false;
        if(first && keyboard.keydownSent)
            return false;
    
        // Only translate to a character if keydown didn't handle the keystroke.
        // Consistency ftw.
        if(!keyboard.keydownSent) {
            // Gecko will set keyCode = 0 for printable characters; nobody else seems to do this.
            if(event.keyCode == 0)
                e.chr = String.fromCharCode(event.charCode);
            // Opera sets which = 0 for NON-printable characters; nobody else seems to do THIS.
            else if(event.which == 0)
                e.chr = null;
            // Usually we can just use charCode if it exists.
            else if(typeof(event.charCode) != 'undefined' && event.charCode > 0)
                e.chr = String.fromCharCode(event.charCode);
            // Finally, in Opera, non-zero which holds the charCode
            else if(typeof(event.charCode) == 'undefined') {
                e.chr = String.fromCharCode(event.which);
            }
        }

        // Always preserve keyCode from the initial keydown event, since Gecko and
        // Opera often trample it in keypress.
        e.key = keyboard.lastKeydown.key;

        // phew.
        return keyboard.fn(e);
    }
})( jQuery );

