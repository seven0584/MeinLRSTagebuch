"use strict";

const {readFileSync,writeFileSync,mkdirSync} = require("node:fs");
const {resolve,dirname} = require("node:path");

const DEFAULT_SOURCE = resolve(__dirname,"../tests/Rechtschreib_Grammatik_Stresstest.md");
const DEFAULT_OUTPUT = resolve(__dirname,"../tests/benchmark-artifacts/corpus.json");

function invariant(condition,message){ if(!condition) throw new Error("Ungültiger Benchmark-Korpus: " + message); }
function section(markdown,number){
  const match = markdown.match(new RegExp("^## " + number + "\\.[^\\n]*\\n([\\s\\S]*?)(?=^## \\d+\\.|$(?![\\s\\S]))","m"));
  invariant(match,"Abschnitt " + number + " fehlt.");
  return match[1];
}
function cells(line){
  invariant(line.startsWith("|") && line.endsWith("|"),"unvollständige Tabellenzeile.");
  return line.slice(1,-1).split(/(?<!\\)\|/u).map(value => value.trim().replace(/\\\|/g,"|"));
}
function literal(value){
  const match = value.match(/^`([\s\S]*)`$/u);
  return match ? match[1] : value;
}
function textLines(markdownSection,label){
  const blocks = [...markdownSection.matchAll(/^```text\n([\s\S]*?)\n```\s*$/gm)];
  invariant(blocks.length === 1,label + " muss genau einen text-Codeblock enthalten.");
  const lines = blocks[0][1].split("\n");
  invariant(lines.length === 60,label + " hat " + lines.length + " statt 60 physische Zeilen.");
  invariant(lines.every(line => line.trim()),label + " enthält eine leere Testeinheit.");
  return lines;
}
function parseCorpus(source){
  invariant(typeof source === "string","Markdown-Eingabe fehlt.");
  const markdown = source.replace(/^\uFEFF/u,"").replace(/\r\n?/g,"\n");
  const inputs = textLines(section(markdown,2),"Fehlertext");
  const references = textLines(section(markdown,5),"Referenzfassung");
  const items = inputs.map((input,index) => ({id:"S" + String(index+1).padStart(2,"0"),input,reference:references[index]}));
  const inputById = new Map(items.map(item => [item.id,item.input]));
  const sites = section(markdown,3).split("\n").filter(line => /^\| F\d{3} \|/u.test(line)).map(line => {
    const row = cells(line);
    invariant(row.length === 7,"Prüfstellen benötigen sieben Spalten.");
    const [id,unit,original,expected,type,expectation,reason] = row;
    invariant(inputById.has(unit),id + " verweist auf unbekannte Einheit " + unit + ".");
    invariant(["Korrektur","Namensabgleich","Stilhinweis"].includes(expectation),id + " hat unbekannte Erwartung.");
    const result = {id,unit,original:literal(original),expected:literal(expected),type,expectation,reason};
    invariant(result.original && inputById.get(unit).includes(result.original),id + " Originalstelle kommt nicht wörtlich in " + unit + " vor.");
    return result;
  });
  invariant(sites.length === 252,"Es gibt " + sites.length + " statt 252 Prüfstellen.");
  sites.forEach((site,index) => invariant(site.id === "F" + String(index+1).padStart(3,"0"),"F-IDs sind nicht eindeutig und lückenlos sortiert."));
  const counts = Object.fromEntries(["Korrektur","Namensabgleich","Stilhinweis"].map(label => [label,sites.filter(site => site.expectation === label).length]));
  invariant(counts.Korrektur === 226 && counts.Namensabgleich === 10 && counts.Stilhinweis === 16,"Die Aufteilung der 252 Prüfstellen weicht von 226/10/16 ab.");
  const controls = section(markdown,4).split("\n").filter(line => /^\| K\d{2} \|/u.test(line)).map(line => {
    const row = cells(line);
    invariant(row.length === 3,"Kontrollfälle benötigen drei Spalten.");
    return {id:row[0],input:literal(row[1]),expected:row[2]};
  });
  invariant(controls.length === 19,"Es gibt " + controls.length + " statt 19 Kontrollfälle.");
  controls.forEach((control,index) => invariant(control.id === "K" + String(index+1).padStart(2,"0"),"K-IDs sind nicht eindeutig und lückenlos sortiert."));
  const nameSection = section(markdown,1).split("### Verbindliche Namensreferenz\n")[1];
  invariant(nameSection,"Verbindliche Namensreferenz fehlt.");
  const names = nameSection.split("\n").filter(line => /^\| (?:Person|Firma|Produkt) \|/u.test(line)).map(line => {
    const row = cells(line);
    invariant(row.length === 2,"Namensreferenz benötigt zwei Spalten.");
    return {type:row[0],name:row[1]};
  });
  invariant(names.length === 10,"Die verbindliche Namensliste benötigt zehn Einträge.");
  const given = nameSection.match(/Weitere korrekt verwendete Vornamen sind ([^.]+)\./u);
  invariant(given,"Zusätzliche korrekte Vornamen fehlen.");
  const givenNames = given[1].split(/,\s*|\s+und\s+/u);
  invariant(givenNames.length === 4 && givenNames.every(Boolean),"Es werden vier zusätzliche Vornamen erwartet.");
  names.push(...givenNames.map(name => ({type:"Person",name})));
  // This object deliberately contains gold data for the evaluator. A blind
  // model invocation must receive only item.input/control.input, never the
  // full item, sites, reference, or names unless testing a named-context arm.
  return {items,controls,sites,names};
}
function loadCorpus(path = DEFAULT_SOURCE){ return parseCorpus(readFileSync(path,"utf8")); }

module.exports = {parseCorpus,loadCorpus};

if(require.main === module){
  const corpus = loadCorpus();
  mkdirSync(dirname(DEFAULT_OUTPUT),{recursive:true});
  writeFileSync(DEFAULT_OUTPUT,JSON.stringify(corpus,null,2)+"\n","utf8");
  process.stdout.write(JSON.stringify({items:corpus.items.length,controls:corpus.controls.length,sites:corpus.sites.length,names:corpus.names.length})+"\n");
}
