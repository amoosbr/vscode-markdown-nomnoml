// upstream markdown-it-fence has a bug regarding marker char validation. leads to errors with i.e. ### headlines
// remove code part, when new upstream release of markdown-it-fence is available
// License notice
// The MIT License (MIT)

// Copyright (c) geekplux <geekplux@gmail.com> (https://github.com/geekplux)

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
'use strict';

var index = function (md, name, opts) {
  function defaultValidate(params) {
    return params.trim().split(' ', 2)[0] === name
  }

  function defaultRender(tokens, idx, _options, env, self) {
    if (tokens[idx].nesting === 1) {
      tokens[idx].attrPush(['class', name]);
    }

    return self.renderToken(tokens, idx, _options, env, self)
  }

  var options = Object.assign({
    validate: defaultValidate,
    render: defaultRender
  }, opts);

  function fence(state, startLine, endLine) {
    // next line mod (fixes set marker is ignored)
    var marker = (options.marker || '`').charCodeAt(0);
    var pos = state.bMarks[startLine] + state.tShift[startLine];
    var max = state.eMarks[startLine];
    var haveEndMarker = false;

    if (state.sCount[startLine] - state.blkIndent >= 4) { return false }
    if (pos + 3 > max) { return false }
    // next line mod (fixes set marker is ignored)
    if (state.src.charCodeAt(pos) != marker) { return false }

    var mem = pos;
    pos = state.skipChars(pos, marker);
    var len = pos - mem;

    if (len < 3) { return false }

    var markup = state.src.slice(mem, pos);
    var params = state.src.slice(pos, max);

    if (params.indexOf(String.fromCharCode(marker)) >= 0) { return false }

    // next line mod (fixes big, code fences in lists)
    if (!options.validate(params)) { return false }

    var nextLine = startLine;

    for (;;) {
      nextLine++;
      if (nextLine >= endLine) { break }

      pos = mem = state.bMarks[nextLine] + state.tShift[nextLine];
      max = state.eMarks[nextLine];

      if (pos < max && state.sCount[nextLine] < state.blkIndent) { break }
      if (state.src.charCodeAt(pos) !== marker) { continue }
      if (state.sCount[nextLine] - state.blkIndent >= 4) { continue }

      pos = state.skipChars(pos, marker);

      if (pos - mem < len) { continue }

      pos = state.skipSpaces(pos);

      if (pos < max) { continue }

      haveEndMarker = true;

      break
    }

    len = state.sCount[startLine];
    state.line = nextLine + (haveEndMarker ? 1 : 0);

    var token;
    // next two lines mod (extracted if block now before loop)
    token = state.push(name, 'div', 0);

    token.info = params;
    token.content = state.getLines(startLine + 1, nextLine, len, true);
    token.markup = markup;
    token.map = [startLine, state.line];

    return true
  }

  md.block.ruler.before('fence', name, fence, {
    alt: ['paragraph', 'reference', 'blockquote', 'list']});
  md.renderer.rules[name] = options.render;
};

module.exports = index;
