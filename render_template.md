# Template rendering library.
The idea of this library came to me one day when I was working on web interface for flights search. Actually I'm not a frontend developer nor web backend developer, but sometimes I want to have nice interface. And this is the time for HTML.

So I constructed some things using such code:
```javascript
var div = document.createElement("div");
div.classList.add("myclass");
div.setAttribute("id", "myid");
div.appendChild(document.createTextNode("mytext"));
```

I think that you'll agree that it is very boring style. It is better to write HTML with some parameters and just insert it into the code. Of course it is a little easier to use some JS library such as jQuery, Vue.js or even use some production ready and mature AngularJS or React.js. But it was a little overhead for my test page. And so I invented this library. It is small, easy to use (only 1 function) and compatible with any JS library. All you need is to prepare templates and render them in any place. But lets start from the beginning.

In all examples bellow I assume that we have following HTML template:
``` html
<html>
    <head>
        <script src="render_template.js"></script>
        <title>Render template</title>
    </head>
    <body>
        <!-- the code is here -->
    </body>
</html>
```
And I'll write only the code inside the body.

## Hello world.
Lets try this HTML:
``` html
    <div style="display:none">
        <div id="tmpl">
            <h1>Hello, World!</h1>
        </div>
    </div>
    <div id="container"></div>
    <script>
        renderTemplate("#container", "#tmpl");
    </script>
```

This example renders content of element with id `tmpl` into element with id `container`. And you will see the Hello, World page. And it is not magic. At first, I create element `<div style="display:none">` which is a container for all templates. And then I create templates. Typically I use `id` attribute for template searching but it is not nescessery. All elements from this template will be recursively copied into container which is the first argument of renderTemplate function. Content of this container is replaced, so you need to add additional `<div>` layer to render several templates into it.

Ok, it does not look very helpful now, does it? Yes, I'd say it too. But it is not all.

## Inserting JS values.
Ok, now we have following HTML:
``` html
    <div style="display:none">
        <div id="tmpl" data-arguments="name">
            <h1>Hello, ${name}!</h1>
        </div>
    </div>
    <div id="container"></div>
    <script>
        renderTemplate("#container", "#tmpl", "John");
    </script>
```

I changed several lines and it looks better. First, for template itself I've added `data-arguments`. It is a list of template arguments. All of these arguments should be additional call arguments of renderTemplate. In our case it is argument `name` with value `John`. And then one of the main features: in `<h1>` I use construction `${name}`. It means "evaluate expression inside `${}` and put result in this place". The result could be Element instance (and in this case renderTemplate just inserts the Node) or text. In this case it is a string "John" so you'll see Hello, John!. It is better now isn't it? Values could be inserted into text nodes of HTML or into attribute values.

## Using loops.
And now:
``` html
    <div style="display:none">
        <div id="tmpl" data-arguments="data">
            <table>
                <tr data-for="var i = 0; i < data.length; i++"><td>${data[i].name}</td><td>${data[i].age}</td></tr>
            </table>
        </div>
    </div>
    <div id="container"></div>
    <script>
        var data = [
            { "name": "John", "age": 33 },
            { "name": "Alice", "age": 18 }
        ];
        renderTemplate("#container", "#tmpl", data);
    </script>
```

Here we use the for loop. If some tag has attribute `data-for` then for loop will be created and so you can insert as many elements with the same structure as you want to. Of cause you could use the loop counter inside you `${}` constructions.

## Returning HTML nodes.
Sometimes you may want to have some element from the rendered template as a HTML Node. For example you may want to set some callback with the closure. It is really easy to do:
``` html
    <div style="display:none">
        <div id="tmpl">
            <a href="#" data-return="a">Click!</a>
        </div>
    </div>
    <div id="container"></div>
    <script>
        var r = renderTemplate("#container", "#tmpl");
        r.a.onclick = function () {
            var x = Math.random();
            return function () {
                alert(x);
            }
        }();
    </script>
```

If element has attribute "data-return" then returned object will contain field with the name specified in the attribute. So you can use Node element to do anything you want to.

## Custom elements.
As I said before you can insert not only text but also HTML Nodes in `${}` constructions. For example:
``` html
    <div style="display:none">
        <div id="tmpl" data-arguments="tags">
            <span data-for="var i = 0; i < tags.size; i++">${genTag(tags[i].text, tags[i].size)}</span>
        </div>
    </div>
    <div id="container"></div>
    <script>
        function genTag(text, size) {
            var el = document.createElement("span");
            el.setAttribute("style", "font-size:" + size.toString());
            el.appendChild(document.createTextNode(text));
            return el;
        }

        var tags = [ { "text": "tag1", "size": 12 }, { "text": "tag2", "size": 18 } ];
        renderTemplate("#container", "#tmpl", tags);
    </script>
```

This code creates tags with different sizes and inserts them into `div` tag.

## Performance.
Every template is precompiled into JS function, so I don't parse templates every time you call renderTemplate. So it should be reasonably fast. I haven't measured the real performance but I promise I will.

