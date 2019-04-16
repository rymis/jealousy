"use strict";

// Small but useful function to render template from invisible div to any element.
// Example of usage:
// <div style="display:none">
//     <ul id="mylist" data-arguments="lst">
//         <li data-return="li" data-for="var i = 0; i < lst.length; i++">${i}: ${lst[i]} ${generateTag()}</li>
//     </ul>
// </div>
// <div id="container"></div>
// <script>renderTemplate("#container", "#mylist", ["first", "second", "third"]);</script>
//
// It is possible to use following data- attributes for rendering control:
// 1. data-arguments - list of arguments for rendering.
// 2. data-for - generate node using for loop. Attribute value will be placed inside for braces.
// 3. data-return - assing this node to the field with specified name in return object. In loops value
//    will be written into array with specified name.
// In attribute values and text nodes it is possible to insert result of any code execution inside ${}.
// And in text node if result of ${} is instance of Element it would be added directly instead of TextNode
// so you can use custom elements inside templates.

// Render template in container.
function renderTemplate(container, template) {
    if (typeof(container) === "string") {
        container = document.querySelector(container);
    }

    if (typeof(template) === "string") {
        template = document.querySelector(template);
    }

    // Clear container:
    container.innerHTML = "";

    // Resulting object generator:
    var res = { };

    res.stack = [[{}]];
    res.set = function (nm, val) {
        var a = this.stack[this.stack.length - 1];
        a[a.length - 1][nm] = val;
    };
    res.add = function () {
        this.stack[this.stack.length - 1].push({});
    };
    res.push = function () {
        this.stack.push([]);
    };
    res.pop = function () {
        var a = this.stack[this.stack.length - 1];
        var obj = {};
        for (var i = 0; i < a.length; i++) {
            for (var k in a[i]) {
                if (typeof(obj[k]) === "undefined") {
                    obj[k] = [];
                }
                obj[k].push(a[i][k]);
            }
        }
        this.stack.pop();
        a = this.stack[this.stack.length - 1];
        for (var k in obj) {
            a[a.length - 1][k] = obj[k];
        }
    };

    // Real arguments:
    var a = [container, res];
    for (var i = 2; i < arguments.length; i++) {
        a.push(arguments[i]);
    }

    if (template.hasAttribute("data-code")) {
        return renderTemplate.storage[template.getAttribute("data-code")].apply(null, a);
    }

    // Function arguments:
    var args = "_rootNode, _result";
    if (template.hasAttribute("data-arguments")) {
        args = args + "," + template.getAttribute("data-arguments");
    }

    var r = null;

    eval("r = function (" + args + ") {var _nodeStack=[_rootNode];" + renderTemplate.genRenderer(template) + ";return _result.stack[0][0];}");

    var rndName = "code_" + Object.keys(renderTemplate.storage).length + "_" + Math.round(Math.random() * 100000);
    renderTemplate.storage[rndName] = r;
    template.setAttribute("data-code", rndName);

    return r.apply(null, a);
}

// prepared templates cache:
renderTemplate.storage = { };

renderTemplate.skip = {
    "data-code": true,      // precompiled code
    "data-for": true,       // for loop definition
    "data-arguments": true, // arguments for the function
    "data-return": true,    // return values for the function
    "id": true              // id should be unique
};

renderTemplate.parseText = function (txt) {
    var res = [];
    while (txt.length > 0) {
        var idx = txt.search("\\$");
        if (idx < 0) {
            res.push({ "text": true, "data": JSON.stringify(txt) });
            break;
        } else {
            if (idx > 0) {
                res.push({ "text": true, "data": JSON.stringify(txt.substring(0, idx)) });
            }
            txt = txt.substring(idx + 1, txt.length);
            if (txt.charAt(0) == "$") {
                res.push({ "text": true, "data": "\"$\"" })
                txt = txt.substring(1, txt.length);
            } else if (txt.charAt(0) == "{") {
                var end = txt.search("}");
                if (end < 0) {
                    res.push({ "text": true, "data": "\"!ERROR IN TEMPLATE (can't find closing brace)!\"" });
                    break;
                }
                res.push({ "text": false, "data": txt.substring(1, end) });
                txt = txt.substring(end + 1, txt.length);
            } else {
                // TODO: do we need $x without {}?
                res.push({"text": true, "data": "\"!ERROR IN TEMPLATE (invalid variable syntax)!\""});
                break;
            }
        }
    }
    return res;
};

renderTemplate.getAttr = function (txt) {
    var lst = renderTemplate.parseText(txt);
    if (lst.length == 0) {
        return "\"\"";
    } else if (lst.length == 1) {
        return lst[0].text ? lst[0].data : "(" + lst[0].data + ").toString()";
    } else {
        var res = "(" + (lst[0].text ? lst[0].data : "(" + lst[0].data + ").toString()");
        for (var i = 1; i < lst.length; i++) {
            res = res + "+" + (lst[i].text ? lst[i].data : "(" + lst[i].data + ").toString()");
        }
        return res + ")";
    }
};

renderTemplate.getText = function (txt) {
    var lst = renderTemplate.parseText(txt);
    var res = "";
    for (var i = 0; i < lst.length; i++) {
        if (lst[i].text) {
            res = res + "_nodeStack[_nodeStack.length - 1].appendChild(document.createTextNode(" + lst[i].data + "));";
        } else {
            res = res + "var _nodeTmp=(" + lst[i].data + ");";
            res = res + "if (_nodeTmp instanceof Element){_nodeStack[_nodeStack.length - 1].appendChild(_nodeTmp);}else{_nodeStack[_nodeStack.length - 1].appendChild(document.createTextNode(_nodeTmp));}";
        }
    }
    return res;
};

// Now we will generate renderer.
renderTemplate.genRenderer = function (node) {
    var func = "";
    if (node.nodeType == 1) { // Node
        if (node.hasAttribute("data-for")) {
            func = func + "_result.push();for(" + node.getAttribute("data-for") + "){_result.add();";
        }

        func = func + "_nodeStack.push(document.createElement(\"" + node.tagName + "\"));";
        if (node.hasAttribute("data-return")) {
            func = func + "_result.set(" + JSON.stringify(node.getAttribute("data-return")) + ",_nodeStack[_nodeStack.length-1]);"
        }

        // Process attributes:
        for (var i = 0; i < node.attributes.length; i++) {
            if (renderTemplate.skip[node.attributes[i].name]) {
                continue;
            }
            var t = renderTemplate.getAttr(node.attributes[i].value);
            func = func + "_nodeStack[_nodeStack.length-1].setAttribute(\"" + node.attributes[i].name + "\"," + t + ");";
        }

        // Process children:
        for (var i = 0; i < node.childNodes.length; i++) {
            func = func + renderTemplate.genRenderer(node.childNodes[i]);
        }

        func = func + "_nodeStack[_nodeStack.length-2].appendChild(_nodeStack[_nodeStack.length - 1]);";
        func = func + "_nodeStack.pop();";

        if (node.hasAttribute("data-for")) {
            func = func + "}_result.pop();";
        }
    } else if (node.nodeType == 3) { // Text node
        if (node.nodeValue.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '') != "") {
            func = func + renderTemplate.getText(node.nodeValue);
        }
    }

    return func;
};

