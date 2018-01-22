const mdf       = require('markdown-it-fence');
const nomnoml   = require('nomnoml');
const dom_parser = require('xmldom').DOMParser;
const xml_serializer = require('xmldom').XMLSerializer;

const vscode = require('vscode');

const render = function(options) {
    return function(tokens, idx, _options, env) {
        const token = tokens[idx];
        try {
            let backgroundColor = vscode.workspace.getConfiguration().get('markdown-nomnoml.style.defaultBackgroundColor');

            let bgResult = /^\#bgColor\:\s?(\S*)/m.exec( token.content );
            if (bgResult) {
                backgroundColor = bgResult[1];
            }

            let strokeColor = vscode.workspace.getConfiguration().get('markdown-nomnoml.style.defaultStrokeAndTextColor');
            // fix nomnoml stroke color option doesn't change text color
            // On nomnoml sample web page #stroke option changes text color.
            let strokeResult = /^\#stroke\:\s?(\S*)/m.exec( token.content );
            if (strokeResult) {
                strokeColor = strokeResult[1];
            }

            var colored_content = token.content;
            if (!strokeResult && strokeColor) {
                colored_content = `#stroke: ${strokeColor}\n${token.content}`
            }

            let shapeColor = vscode.workspace.getConfiguration().get('markdown-nomnoml.style.defaultShapeColor');
            let shapeColorResult = /^\#fill\:\s?(\S*)/m.exec( token.content );
            if (shapeColorResult) {
                shapeColor = shapeColorResult[1];
            }

            if (!shapeColorResult && shapeColor) {
                colored_content = `#fill: ${shapeColor}\n${colored_content}`
            }

            var html_svg = nomnoml.renderSvg(colored_content);

            if (strokeColor != null || backgroundColor != null) {
                let parser = new dom_parser();
                let svgDoc = parser.parseFromString(html_svg,"text/xml");

                if (backgroundColor != null) {
                    let svg = svgDoc.getElementsByTagName("svg")[0];
                    let svg_style = svg.getAttribute('style');
                    svg.setAttribute('style', `${backgroundColor != null ? 'background-color:' + backgroundColor + ';' : '' }${svg_style}`);
                }

                if (strokeColor != null) {
                    let text_elements = svgDoc.getElementsByTagName("text");
                    for (let i = 0; i < text_elements.length; i++) {
                        text_elements[i].setAttribute('style', `fill: ${strokeColor};`);
                    }
                }

                let serialize = new xml_serializer();
                html_svg = serialize.serializeToString(svgDoc);
            }

            html_svg = `<div class="markdown-nomnoml">${html_svg}</div>`


        }
        catch(err) {
            html_svg = '<pre><code class="language-nomnoml">\n' +
                        token.content + '\n' +
                        '</code></pre>';
        }
        
        return html_svg;
    }
}

module.exports = function(md, options) {
    return mdf(md, 'nomnoml', {
        marker: '`',
        render: render(options)
    });
}