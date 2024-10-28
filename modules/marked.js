const sanitizeHtml = require('sanitize-html');
const highlight = require('highlight.js');
const marked = require('marked');

marked.setOptions({
    renderer: new marked.Renderer(),
    smartLists: true,
    gfm: true,
    pedantic: false,
    highlight: (code, lang) => {
        const validLang = highlight.getLanguage(lang) ? lang : "plaintext";
        return highlight.highlight(validLang, code).value;
    }
})

const highlightString = (input, language) => {
    return highlight.highlight(language, input).value;
}

const sanitizeDefault = (input) => {
    if (!input) {
        return undefined;
    }
    return sanitizeHtml(input, {
        allowedTags: ["b", "i", "strong", "marquee", "em", "u", "div", "span", "p"],
        allowedAttributes: {
            "marquee": ["scrollamount", "direction", "loop", "bgcolor"]
        },
        allowedClasses: {
            "button": ["button", "is-success", "is-info", "is-link", "is-dark"],
            "div": ["is-success", "is-info", "is-link", "is-dark", "notification"],
            "p": ["image", "is-64x64"]
        }
    })
}

const sanitizeSubtitle = (input) => {
    if (!input) {
        return undefined;
    }
    return sanitizeHtml(input, {
        allowedTags: ["i", "span", "small", "b", "i", "strong"],
        allowedAttributes: {
            "i": ["aria-role", "aria-label", "title"],
            "span": ["title"]
        },
        allowedClasses: {
            "i": ["em", "em-*", "fas", "fab", "fa-*"]
        }
    })
}

const sanitizeFull = (input) => {
    if (!input) {
        return undefined;
    }
    return sanitizeHtml(input, {
        allowedTags: [],
        allowedAttributes: {},
        allowedClasses: {}
    })
}

const markAndSanitize = async (input) => {
    if (!input) {
        return undefined;
    }
    return marked.parse(sanitizeDefault(input));
}

const mark = (input) => {
    if (!input) {
        return undefined;
    }
    return marked.parse(input);
}

module.exports = { markAndSanitize, sanitizeDefault, mark, highlightString, sanitizeSubtitle, sanitizeFull }