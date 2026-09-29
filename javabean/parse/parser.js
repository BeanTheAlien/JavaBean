"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.parser = parser;
const errors_js_1 = require("../errors.js");
const fs = __importStar(require("fs"));
const interp_js_1 = require("../interp.js");
async function parser(file, tks) {
    let i = 0;
    while (i < tks.length) {
        const expr = parseExpr(tks, i);
        i = expr.next;
        if (!fs.existsSync(file))
            fs.writeFileSync(`out/${file.split("\\")[1].split(".")[0]}.java`, `public class ${file.split("\\")[1].split(".")[0]} {`);
        fs.appendFileSync(`out/${file.split("\\")[1].split(".")[0]}.java`, (0, interp_js_1.interp)(file, expr.node));
    }
}
function parsePrim(tks, i) {
    const tk = tks[i];
    // check for paren at some point
    // likely call
    if (tk.id == "id" && tks[i + 1]) {
        const s = tks.slice(i + 1);
        if (s.some(t => t.id == "lparen")) {
            const sx = s.slice(0, s.findIndex(t => t.id == "lparen"));
            return { node: { type: "CallExpr", val: sx }, next: i + sx.length };
        }
    }
    // construction (no global appension)
    if (tk.id == "id" && tk.val == "new") {
        const pp = parsePrim(tks, i + 1);
        return { node: { type: "New", val: pp.node.val }, next: pp.next };
    }
    // array (swap for Arrays.asList)
    if (tk.id == "lbracket") {
        const s = tks.slice(0, tks.findIndex(x => x.id == "rbracket"));
        return { node: { type: "Array", val: s.map(x => x.val) }, next: i + s.length };
    }
    // array accessor (replace with get)
    if (tk.id == "id" && tks[i + 1]?.id == "lbracket" && tks[i + 2]?.id == "num") {
        const n = Number(tks[i + 2].val);
        return { node: { type: "ArrayAcs", val: [tk.val, n] }, next: i + 3 };
    }
    // no idea
    return { node: { type: "Id", val: tk.val }, next: i + 1 };
}
function parseExpr(tks, i) {
    let { node, next } = parsePrim(tks, i);
    while (tks[next] && (tks[next].id == "dot" || tks[next].id == "lparen")) {
        const tk = tks[next];
        if (tk.id == "dot") {
            const prop = tks[next + 1];
            node = {
                type: "MemberExpr",
                val: { obj: node, prop: prop.val }
            };
            next += 2;
        }
        else if (tk.id == "lparen") {
            const args = parseArgs(tks, next + 1);
            node = {
                type: "CallExpr",
                val: { callee: node, args: args }
            };
            next = args.next;
        }
    }
    return { node, next };
}
function parseArgs(tks, i) {
    const args = [];
    while (i < tks.length && tks[i].id != "rparen") {
        const expr = parseExpr(tks, i);
        args.push(expr.node);
        i = expr.next;
        if (tks[i]?.id == "comma")
            i++;
    }
    if (tks[i]?.id != "rparen")
        throw new Error();
    return { args, next: i + 1 };
}
function parseCommaList(tks, i) {
    const list = [];
    let count = 1;
    while (i < tks.length && count > 0) {
        const expr = parseExpr(tks, i);
        list.push(expr.node);
        i = expr.next;
        if (tks[i]?.id == "comma") {
            count++;
        }
        else {
            count--;
        }
    }
    return { list, next: i };
}
function retrieveBlock(tks, i) {
    let body = [];
    let depth = 0;
    i++;
    while (i < tks.length) {
        const tk = tks[i];
        if (tk.id == "lbrace")
            depth++;
        if (tk.id == "rbrace")
            depth--;
        if (depth == 0)
            break;
        body.push(tk);
        i++;
    }
    i++;
    if (depth > 0)
        throw new errors_js_1.UnterminatedStatementError(tks[i - 1], "block", "}");
    return body;
}
function parseBlock(body) {
    let parsed = [];
    let i = 0;
    while (i < body.length) {
        const p = parseExpr(body, i);
        parsed.push(p.node);
        i = p.next;
    }
    return { node: { type: "BlockStm", val: parsed }, next: i };
}
