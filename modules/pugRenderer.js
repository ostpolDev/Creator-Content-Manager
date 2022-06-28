const pug = require('pug');
const path = require('path');
const fs = require('fs');

const viewsPath = path.join(__dirname, "..", "views");

const render = function (req, pugPath, vars) {
    try {
        if (!pugPath.endsWith(".pug")) {
            pugPath = pugPath + ".pug";
        }

        if (!vars) {
            vars = {};
        }
        if (req && req.__) {
            vars["__"] = req.__;
        } else {
            vars["__"] = i18n.__;
        }

        let finalPath = path.join(viewsPath, pugPath);

        if (fs.existsSync(finalPath)) {
            let fn = pug.compileFile(finalPath);
            return fn(vars);
        } else {
            return undefined;
        }
    } catch (e) {
        console.error(e);
        return undefined;
    }
}

module.exports = {render}