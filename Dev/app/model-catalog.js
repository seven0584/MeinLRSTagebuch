(function(root){
  "use strict";
  // Download sizes, not RAM requirements; candidates require a parent quality check.
  const models = Object.freeze([
    {id:"gpt-oss:20b",label:"OpenAI gpt-oss · 20B",size:"ca. 14 GB",note:"Lokales OpenAI-Modell mit kurzer Denkphase. Benötigt viel freien Arbeitsspeicher; Antworten können länger dauern. Qualität mit den Testfragen prüfen.",license:"Apache-2.0",url:"https://ollama.com/library/gpt-oss:20b"},
    {id:"qwen3:4b-instruct-2507-q4_K_M",label:"Qwen 3 Instruct · 4B",size:"ca. 2,5 GB",note:"Kleiner Einstieg mit direkten Antworten; mehrsprachig.",license:"Apache-2.0",url:"https://ollama.com/library/qwen3:4b-instruct-2507-q4_K_M"},
    {id:"qwen3:8b",label:"Qwen 3 · 8B",size:"ca. 5,2 GB",note:"Größere Variante; benötigt mehr Arbeitsspeicher.",license:"Apache-2.0",url:"https://ollama.com/library/qwen3:8b"},
    {id:"gemma3:4b",label:"Gemma 3 · 4B",size:"ca. 3,4 GB",note:"Mehrsprachige Alternative.",license:"Gemma-Nutzungsbedingungen",url:"https://ollama.com/library/gemma3:4b"}
  ]);
  if(typeof module === "object" && module.exports) module.exports = models;
  else root.TB_MODELS = models;
})(typeof globalThis !== "undefined" ? globalThis : this);
