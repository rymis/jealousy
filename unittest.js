// We need to emulate document and window:

// Class Element allows us to have elements:
function Element() {
}

Element.prototype = {
    "_init": function (type, obj) {
        this.nodeType = type;
        for (var k in obj) {
            this[k] = obj[k];
        }
    }
};

function TextNode(text) {
    this._init(3, { "nodeValue": text });
    this.serialize = function () {
        return this.nodeValue;
    }
}
TextNode.prototype = new Element();

function DocNode(name) {
    this._init(1, { "childNodes": [], "attributes": {}, "tagName": name });
    /*
    this.innerHTML = set () {
        this.childNodes = [];
    };
    */
    this.appendChild = function (child) {
        this.childNodes.push(child);
    };
    this.setAttribute = function (key, value) {
        this.attributes[key] = value;
    };
    this.getAttribute = function (key) {
        return this.attributes[key];
    };
    this.hasAttribute = function (key) {
        return typeof(this.attributes[key]) !== "undefined";
    };
    this.serialize = function () {
        var attrs = [];
        for (var k in this.attributes) {
            attrs.push(k + ":" + this.attributes[k]);
        }
        attrs.sort();
        var res = this.tagName;
        for (var i = 0; i < attrs.length; i++) {
            res = res + "[" + attrs[i] + "]";
        }

        res = res + "{";
        for (var i = 0; i < this.childNodes.length; i++) {
            res = res + this.childNodes[i].serialize();
        }
        res = res + "}";
        return res;
    };
}
DocNode.prototype = new Element();

var document = {
    "createTextNode": function (text) {
        return new TextNode(text);
    },
    "createElement": function (name) {
        return new DocNode(name);
    },
    "querySelector": function (selector) {
        return [];
    },
};

// Create document nodes from JSON template.
function createNodeFromJSON(json) {
    function createNode(js) {
        if (typeof(js) === "string") {
            return document.createTextNode(js);
        } else {
            var keys = Object.getOwnPropertyNames(js);
            if (keys.length != 1) {
                throw "Template object should contain exactly one key: " + JSON.stringify(js);
            }
            var tmpl = js[keys[0]];
            var node = document.createElement(keys[0]);
            for (var key in js[keys[0]]) {
                if (key === "") {
                    var children = js[keys[0]][""];
                    if (typeof(children) == "string") {
                        node.appendChild(document.createTextNode(children));
                    } else if (children instanceof Array) {
                        for (var i = 0; i < children.length; i++) {
                            node.appendChild(createNode(children[i]));
                        }
                    } else {
                        console.log(typeof(children));
                        node.appendChild(createNode(children));
                    }
                } else {
                    node.setAttribute(key, js[keys[0]][key]);
                }
            }
            return node;
        }
    }

    return createNode(json);
}

var x = { "div": {
            "id": "test",
            "": [
                { "a": {
                    "href": "http://example.com",
                    "": "example"
                }}
            ]
}};

function dbg() {
    var s = "";
    for (var i = 0; i < arguments.length; i++) {
        if (s.length > 0) {
            s = s + " ";
        }
        if (typeof(arguments[i]) === "string") {
            s = s + arguments[i];
        } else {
            s = s + JSON.stringify(arguments[i]);
        }
    }
    console.log(s);
}

var a = createNodeFromJSON(x);
dbg(a.serialize());

function run(fcn) {
    dbg("[RUNNING]", fcn.name);
    try {
        fcn();
        dbg("[OK]", fcn.name);
    } catch (err) {
        dbg("[ERROR]", fcn.name, "failed with message:", err);
    }
}

// Test variables:
function testVariableAndEscape() {
    var el = new DocNode("div");
    el.setAttribute("data-arguments", "i");
    el.appendChild(new TextNode("${i}"));
    el.appendChild(new DocNode("h1"));
    el.appendChild(new TextNode("$$"));

    var container = new DocNode("div");
    renderTemplate(container, el, 13);

    if (container.serialize() != "div{div{13h1{}$}}") {
        dbg(container.serialize());
        throw "Variables and escape failed";
    }
}

run(testVariableAndEscape);

