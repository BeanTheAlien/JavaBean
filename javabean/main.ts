import * as fs from "fs";
import { tokenize } from "./tokenizer.js";
import { parser } from "./parse/parser.js";

const [,, dirp] = process.argv;
const ents = fs.readdirSync(dirp, { recursive: true, withFileTypes: true });
const file = ents.filter(x => x.isFile());
// make output directory
// to not pollute wd
// if exists, delete
if(fs.existsSync("out")) fs.rmSync("out", { recursive: true });
fs.mkdirSync("out");
// create Global file
// and JB* files
fs.writeFileSync("out/Global.java", "public class Global {");
const jbFiles = ["JBString", "JBInt", "JBBool", "JBChar", "JBObject"];
jbFiles.forEach(f => fs.writeFileSync("out/" + f + ".java", `public class ${f} {`));
file.forEach(async f => {
    const n = f.parentPath + "\\" + f.name;
    await parser(n, (await tokenize(fs.readFileSync(n, "utf8"))));
});
// seal global/jb
fs.appendFileSync("out/Global.java", "}");
jbFiles.forEach(f => fs.appendFileSync("out/" + f + ".java", "}"));
file.forEach(f => {
    fs.appendFileSync(`out/${f.name.split(".")[0]}.java`, "}");
});