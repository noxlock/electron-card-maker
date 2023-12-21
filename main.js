const { app, BrowserWindow, ipcMain} = require('electron')

const path = require('path')
const fs = require('fs')

const Kuroshiro = require("kuroshiro")
const {tokenize, getTokenizer} = require("kuromojin");
const KuromojiAnalyzer = require("kuroshiro-analyzer-kuromoji");

const axios = require('axios')

const Datastore = require('@seald-io/nedb')

const NodeCache = require( "node-cache" );
const cache = new NodeCache();

let db = new Datastore({
    filename: './dict.db', autoload: true
})

let readData = null;

const handleFileOpen = async (event, path) => {
    readData = fs.readFileSync(
        path,
        {encoding: 'utf8'}
    ).toString().split("\r\n");
    return readData;
};


const getNext = async () => {
    let pgNum = readData.shift()
    let sentence = await tokenize(readData.shift())
    return [pgNum, sentence];
}


const getMeanings = async (event, kanji_kana) => {
    let meanings = []
    
    let key = kanji_kana.kanji.toString() + kanji_kana.kana
    let cached = cache.get(key)
    if (cached) {
        return cached
    } else {
        const docs = await db.find({"kanji.text": kanji_kana.kanji, "kana.text": kanji_kana.kana})
        if (docs.length >= 1) {
            for (sense of docs[0].sense) {
                for (gloss of sense.gloss) {
                    meanings.push(gloss.text)
                }
            }
        }
    }
    cache.set(key, meanings)
    return meanings
}


const makeNote = async (event, sentence, word, meaning, image) => {
    let path = await axios.post("http://127.0.0.1:8765", JSON.stringify({
        "action": "getMediaDirPath",
        "version": 6
    }))
    path = path.data.result

    let url = `https://assets.languagepod101.com/dictionary/japanese/audiomp3.php?kanji=${word.kanji}&kana=${word.kana}`
    let res = await axios.post('http://127.0.0.1:8765', JSON.stringify({
        "action": "multi",
        "version": 6,
        "params": {
            "actions": [{
                "action": "storeMediaFile",
                "params": {
                    "filename": `${word.kanji}-${word.kana}.jpg`,
                    "data": image
                }
            },
            {
                "action": "storeMediaFile",
                "params": {
                    "filename": `${word.kanji}-${word.kana}.mp3`,
                    "url": url
                }
            },
            {
                "action": "addNote",
                "version": 6,
                "params": {
                    "note": {
                        "deckName": "Mining",
                        "modelName": "mining",
                        "fields": {
                            "Front": sentence,
                            "FullWord": word.kanji,
                            "Reading": word.kana,
                            "Glossary": meaning,
                        },
                        "tags": [
                            "electron"
                        ],
                        "audio": [{
                            "filename": `${word.kanji}-${word.kana}.mp3`,
                            "path": `${path}/${word.kanji}-${word.kana}.mp3`,
                            "fields": [
                                "Audio"
                            ]
                        }],
                        "picture": [{
                            "filename": `${word.kanji}-${word.kana}.jpg`,
                            "path": `${path}/${word.kanji}-${word.kana}.jpg`,
                            "fields": [
                                "Picture"
                            ]
                        }]
                    },
                }
            }]
        }
    }))
    console.log(res.data.result[2])
    return res.data.result[2].result
}


const openNote = async (event, note_id) => {
    await axios.post("http://127.0.0.1:8765", JSON.stringify({
        "action": "guiBrowse",
        "version": 6,
        "params": {
            "query": `nid:${note_id}`
        }
    }))
}


const createWindow = () => {
    const win = new BrowserWindow({
        width: 1920,
        height: 1080,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
        }
    })
    win.loadFile('index.html')
}

app.whenReady().then(async () => {
    // Setup tokenizer
    await getTokenizer()

    // Setup kuroshiro for furigana
    const kuroshiro = new Kuroshiro();
    await kuroshiro.init(new KuromojiAnalyzer())

    ipcMain.handle('openFile', handleFileOpen)
    ipcMain.handle('getNext', getNext)
    ipcMain.handle('getFurigana', async (event, sentence) => {
        if (Kuroshiro.Util.hasKanji(sentence)) {
            return await kuroshiro.convert(sentence, {mode: 'furigana', to: 'hiragana'})
        }
        return sentence
    })
    ipcMain.handle('getKana', async (event, word) => {
        if (!Kuroshiro.Util.hasKanji(word)) {
            return {kanji: [], kana: word}
        }
        let kana = await kuroshiro.convert(word, {mode: 'normal', to: 'hiragana'})
        return {kanji: word, kana: kana}
    })
    ipcMain.handle('getMeanings', (event, kanji_kana) => {
        return getMeanings(event, kanji_kana)
    })
    ipcMain.handle('makeNote', async (event, sentence, word, meaning, image) => {
        return makeNote(event, sentence, word, meaning, image)
    })
    ipcMain.handle('openNote', async (event, note_id) => {
        return openNote(event, note_id)
    })

    createWindow()
})