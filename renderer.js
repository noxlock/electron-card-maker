// TODO: not hardcode it
let dir = `file:///N:/NDownloads/jap/Reading/Soul%20Eater/%E3%82%BD%E3%82%A6%E3%83%AB%E3%82%A4%E3%83%BC%E3%82%BF%E3%83%BC%20%E7%AC%AC07%E5%B7%BB/%E3%82%BD%E3%82%A6%E3%83%AB%E3%82%A4%E3%83%BC%E3%82%BF%E3%83%BC%20%E7%AC%AC07%E5%B7%BB/%E3%82%BD%E3%82%A6%E3%83%AB%E3%82%A4%E3%83%BC%E3%82%BF%E3%83%BC_`

const open = async (path) => {
    const response = await window.electronAPI.openFile(path)
    return response;
}

const next = async () => {
    // Get the next sentence/page combo
    const response = await window.electronAPI.getNext()
    
    // Populate sentence holder
    let holder = document.getElementById('sentence-holder')
    holder.innerHTML = ''

    // Add the page image to the cropper
    replace(dir + `${response[0]}.jpg`)

    // Add onclick for flipping between pages (for images only, not sentences)
    let left_arrow = document.getElementsByClassName('left-arrow')
    let right_arrow = document.getElementsByClassName('right-arrow')
    left_arrow[0].addEventListener("click", flip.bind(this, -1))
    right_arrow[0].addEventListener("click", flip.bind(this, 1))

    for (i of response[1]) {
        // Get furigana
        let furigana = await window.electronAPI.getFurigana(i.surface_form)
        // Create a separate block of text for each word
        let p = document.createElement("p");
        p.innerHTML = furigana
        holder.appendChild(p)
        // Add a listener so we can 'select' words
        p.addEventListener("click", select.bind(this));
    }

    return response;
}

const flip = async (direction) => {
    // TODO: Should instead check how many leading zeroes the first pgNum has
    if (direction == 1) {
        replace(dir + `${pgNum[0]}_00${parseInt(pgNum[1]) + 1}.jpg`)
    } else {
        replace(dir + `${pgNum[0]}_00${parseInt(pgNum[1]) - 1}.jpg`)
    }

}

const getWordDetails = async (target) => {
    let kanji = ''
    let kana = ''
    let furigana = ''
    let following = ''

    // if Kana, else Kanji
    if (target.childNodes.length == 1) {
        
        kana = target.childNodes[0].textContent
        return {kanji: [], kana: kana}
    } else {
        // okurigana is included in textContent, remove it
        kanji = target.childNodes[0].textContent.replace(/ *\([^)]*\) */g, "")
    }

    // If following Kanji
    if (target.childNodes.length >= 1) {
        if (target.childNodes.length >= 2 && target.childNodes[1].textContent != "(") {
            following = target.childNodes[1].textContent
        }
    }

    // Compound words have their furigana in different spots..
    if (target.childNodes[0].childNodes.length == 4) {
        furigana = target.childNodes[0].childNodes[2].textContent
    } else if (kanji) {
        furigana = target.childNodes[2].textContent
    }

    if (kanji && !following ) {
        return {kanji: kanji, kana: furigana}
    } else if (kanji && following) {
        return {kanji: kanji + following, kana: furigana + following}
    }
}

const getMeanings = async (selected) => {
    let target = selected.target
    let word = await getWordDetails(target)

    return await window.electronAPI.getMeanings(word)
}

const makeNote = async (img) => {
    // Get sentence
    let sentence = document.getElementById('sentence-holder').innerHTML
    sentence = sentence.trim().replace(/<\/?p[^>]*>/g, "");

    // Get selected word
    let target = document.getElementsByClassName('selected-word')[0]
    let word = await getWordDetails(target)

    // Get selected meaning
    let meaning = document.getElementsByClassName('selected-meaning')[0]

    return await window.electronAPI.makeNote(sentence, word, meaning.innerHTML, img)
}

const openNote = async (note_id) => {
    console.log(note_id)
    await window.electronAPI.openNote(note_id)
}