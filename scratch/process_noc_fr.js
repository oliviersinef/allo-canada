const fs = require('fs');

// Read files assuming they might be in different encodings (StatCan is usually UTF-8)
function readNocFile(path) {
    return fs.readFileSync(path, 'utf8');
}

console.log("Loading files...");
const structureRaw = readNocFile('cnp-structure-fr.csv');
const elementsRaw = readNocFile('cnp-elements-fr.csv');

const codes = {};

// Parse Structure
console.log("Parsing structure...");
const structureLines = structureRaw.split('\n');
structureLines.forEach(line => {
    const parts = line.split(',');
    if (parts.length >= 4 && parts[0] === '5') { // Level 5 = Unit Group
        const code = parts[2].replace(/"/g, '').trim();
        const title = parts[3].replace(/"/g, '').trim();
        codes[code] = {
            code: code,
            title: title,
            examples: [],
            feer: code.length >= 2 ? code[1] : '?' // 2nd digit is FEER
        };
    }
});

// Parse Elements
console.log("Parsing elements...");
const elementsLines = elementsRaw.split('\n');
elementsLines.forEach(line => {
    const parts = line.split(',');
    if (parts.length >= 5 && parts[0] === '5') {
        const code = parts[1].replace(/"/g, '').trim();
        const type = parts[3].replace(/"/g, '').trim();
        const example = parts[4].replace(/"/g, '').trim();
        
        if (codes[code] && type.includes('Exemple')) {
            codes[code].examples.push(example);
        }
    }
});

const documents = Object.values(codes).map(item => {
    return {
        url: `https://noc.esdc.gc.ca/Structure/NocProfile?objectid=${item.code}`,
        title: `CNP 2021 : ${item.code} - ${item.title}`,
        content: `Classification Nationale des Professions (CNP) 2021. 
Code : ${item.code}. 
Titre : ${item.title}. 
Catégorie FEER : ${item.feer}. 
Métiers inclus et exemples : ${item.examples.join(', ')}.`
    };
});

console.log(`Generated ${documents.length} documents.`);
fs.writeFileSync('noc_rag_data.json', JSON.stringify(documents, null, 2));
console.log("Saved to noc_rag_data.json");
