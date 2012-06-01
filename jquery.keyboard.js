/*
   jquery.keyboard.js

   This simple jQuery plugin provides a keyboard method for trapping
   keystroke events while avoiding many of the inconsistences that appear
   from browser to browser.

   This does not allow the caller to set up specific hotkey
   handlers, but instead enables the registration of a single global keypress
   handler that takes a consistent, well-defined event argument.

   Example:

   $(document).ready(function() {
    // The counter illustrates sane key-repeat handling without dupes.
    var counter = {}
    $(document).keyboard(function(e) {
       var keyname = e.chr;
       if(keyname === null)
           keyname = $.KeyNames[e.key];
       if(e.shift) keyname = "S-" + keyname;
       if(e.alt) keyname = "A-" + keyname;
       if(e.ctrl) keyname = "C-" + keyname;
       if(!(keyname in counter)) { counter = {}; counter[keyname] = 1; }
       else ++counter[keyname];
           $('body').html("You pressed: " + keyname + "(" + counter[keyname] + " times)");
    });
   });

   Additionally, the $.Keys object provides named entries for various common
   key codes, though some of these will vary with different keyboard layouts.
   Common keys like $.Keys.Enter, $.Keys.Escape, $.Keys.Space, and $.Keys.Tab
   should be safe to rely upon.

   For any given keystroke or key combination, you can expect exactly
   the same event content in a Webkit, Gecko, or even Opera* browser.

   The semantics of a keyboard event e are as follows:

    - e.key always holds a valid key code; it usually has an entry in $.KeyNames
      and is comparable to a named entry in $.Keys
    - e.chr contains a character representation of the keystroke iff
      neither Ctrl or Alt is pressed, the keystroke has a character representation,
      and the key is not Space, Enter, or Tab.
    - If a valid character representation is not in e.chr, e.chr is null.
    - e.chr is affected by the Shift modifier.  An event with e.key === $.Keys.Key0
      and e.shift === true will hold e.chr === ')'.
    - e.alt, e.ctrl, and e.shift are boolean key states that are always accurate.
    - Most keys and key combinations will fire repeated keyboard events when held
      down.*

   * Opera still does some funky things that may be unavoidable.  Namely:

    - Numeric keypad events always behave as if Num Lock is off.
    - Unlike with Gecko and Webkit, Ctrl, Alt, and Shift keystrokes do not repeat.
      Combinations they modify (e.g. Ctrl+D) do still repeat.
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
    for(var key in $.Keys) {
        $.KeyNames[$.Keys[key]] = key;
    }

    var Keys = $.Keys;
    var keyboard = {
        fn: function(e) {
            return false;
        },
        lastKeydown: {},
        keydownSent: false,
        firstKeypress: false,
        registered: false
    };

    $.fn.keyboard = function(fn) {
        keyboard.fn = fn;
        if(!keyboard.registered) {
            this.keydown(keyboard.onKeydown);
            this.keypress(keyboard.onKeypress);
            keyboard.registered = true;
        };
    };

    // Keydown events are only propagated to the handler if
    // Ctrl or Alt modifiers are pressed, or if the actual keystroke
    // is a special key.  Otherwise the keypress handler is used.
    // This works on the observation that keydown always fires first
    // in cases where a keystroke generates both a keydown and
    // keypress event.
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
    };

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
        if(first && keyboard.keydownSent) {
            return false;
        }
    
        // Only translate to a character if keydown didn't handle the keystroke.
        if(!keyboard.keydownSent) {
            // Gecko will set keyCode = 0 for printable characters; nobody else seems to do this.
            if(event.keyCode === 0) {
                e.chr = String.fromCharCode(event.charCode);
            }
            // Opera sets which = 0 for non-printable characters; nobody else seems to do this.
            else if(event.which === 0) {
                e.chr = null;
            }
            // Usually we can just use charCode if it exists.
            else if(typeof(event.charCode) !== 'undefined' && event.charCode > 0) {
                e.chr = String.fromCharCode(event.charCode);
            }
            // Finally for Opera, a non-zero event.which holds the charCode
            else if(typeof(event.charCode) === 'undefined') {
                e.chr = String.fromCharCode(event.which);
            }
        }

        // Always preserve keyCode from the initial keydown event, since Gecko and
        // Opera often trample it in keypress.
        e.key = keyboard.lastKeydown.key;

        return keyboard.fn(e);
    };
})( jQuery );

