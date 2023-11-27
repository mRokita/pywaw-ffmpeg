Reveal.initialize({
    hash: true,
    width: 1280,
    keyboard: {
        88: () => {
            document.querySelector('.present .playback-button').$$click(new Event('click'))
        },
        67: () => {
            document.querySelector('.present .fullscreen-button').$$click(new Event('click'))
        },
	//39: 'navigateNext',
	//37: 'navigatePrev'
    },
    height: 1024,
    center: true,
    slideNumber: 'c/t',
    // Learn about plugins: https://revealjs.com/plugins/
    plugins: [RevealMarkdown, RevealHighlight, RevealNotes, RevealZoom]
});
var player;

let doMermaidStuff = function doMermaidStuff(event) {

    let mermaidDivs = event.currentSlide.querySelectorAll('.mermaid:not(.done)');
    let indices = Reveal.getIndices();
    let pageno = `${indices.h}-${indices.v}`

    mermaidDivs.forEach(function (mermaidDiv, i) {

        let insertSvg = function (svgCode, bindFunctions) {
            mermaidDiv.innerHTML = svgCode;
            console.log(svgCode)
            mermaidDiv.classList.add('done');
        };
        let graphDefinition = mermaidDiv.textContent;
        mermaid.mermaidAPI.render(`mermaid${pageno}-${i}`, graphDefinition, insertSvg);
    });

};

mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    'themeVariables': {
        primaryColor: 'black',
        darkMode: true,
        lineColor: "#a742ff",
        primaryBorderColor: "#a742ff",
        noteBkgColor: '#a742ff',
        secondaryBorderColor: 'black',
        background: '#a742ff',
        'primaryTextColor': 'white'
    }
});

function getCurrentCast(){
    let currentStack = document.getElementsByClassName("present")[0];
    let currentPlayerDiv = currentStack.getElementsByClassName("present")[0].getElementsByClassName("asciinema")[0];

    return currentPlayerDiv ? {cast: currentPlayerDiv.getAttribute("data-cast"), div: currentPlayerDiv} : {cast: null, div: null}
}

Reveal.on('ready', event => {
    document.querySelectorAll('foreignObject').forEach(fo => {
        fo.setAttribute('width', Number(fo.getAttribute('width')) + 2.0);
        fo.setAttribute('height', Number(fo.getAttribute('height')) + 2.0);
    })

})

function createPlayer(cast, playerDiv){
    return AsciinemaPlayer.create(cast, playerDiv, {
        theme: 'asciinema',
        autoPlay: false,
        poster: 'npt:0:00.1'
    });
}
let castToPlayer = {}
let castToDiv = {}
var prevCast;
var started = false;
var lastClick = null;
var hudTimeout = null
var lastClickPlaying = true;
function showHud(dontHide){
    let player = document.querySelector('.present .asciinema-player-wrapper')
    if(!player.className.includes(" hud")) player.className += " hud"
    if(hudTimeout){
        clearTimeout(hudTimeout)
    }
    if(!dontHide){
        hudTimeout = setTimeout(() => {
            let player = document.querySelector('.present .asciinema-player-wrapper')
            console.log('disable hud')
            player.className = player.className.replaceAll(" hud", "")
            console.log(player.className)
        }, 500)
    }

}
function cleanupListeners(){
    Reveal.removeKeyBinding(39);

    Reveal.removeKeyBinding(33);

    Reveal.removeKeyBinding(34);

    Reveal.removeKeyBinding(37);
    Reveal.addKeyBinding(37, Reveal.prev)
    Reveal.addKeyBinding(39, Reveal.next) 
}

cleanupListeners();


function asciinemaControl(event) {
    let isPlaying = !document.querySelector('[d="M1,0 L11,6 L1,12 Z\"]')
    if(isPlaying){
        started = true;
    }
    if(!isPlaying){
        showHud(true);
    }
    let doubleClick = lastClick === event.keyCode;

    let right = event.keyCode === 34 || event.keyCode === 39;
    let left = event.keyCode === 33 || event.keyCode === 37;

    if(!doubleClick) {
        if (right && !started) {
            document.querySelector('.present .playback-button').$$click(new Event('click'))
            started = true;
        } else if (left && isPlaying) {
            document.querySelector('.present .playback-button').$$click(new Event('click'))
        } else if (!isPlaying && right) {
            document.querySelector('.present .playback-button').$$click(new Event('click'))
            showHud(true);
        } else if (right && !started) {
            document.removeEventListener('keydown', asciinemaControl)
            cleanupListeners();
            Reveal.prev();
        } else if (left && !isPlaying){
            showHud(true);
            let player = document.querySelector('.present .asciinema-player-wrapper')
            player.focus();
            player.dispatchEvent(new KeyboardEvent('keypress', {key: "ArrowLeft", charCode: 0, keyCode: 38}));
        } if (right) {
            showHud();
            let player = document.querySelector('.present .asciinema-player-wrapper')
            player.focus();
            player.dispatchEvent(new KeyboardEvent('keypress', {key: "ArrowRight", charCode: 0, keyCode: 39}));
        }
    }
    if(doubleClick && right && !lastClickPlaying){

            document.removeEventListener('keydown', asciinemaControl)
            cleanupListeners();
            Reveal.next();
    }
    if(doubleClick && left && !lastClickPlaying){

            document.removeEventListener('keydown', asciinemaControl)
            cleanupListeners();
            Reveal.prev();
    }
    lastClick = event.keyCode;
    lastClickPlaying = isPlaying
    setTimeout(() => {lastClick = null; lastClickPlaying = true;}, 200)
}

Reveal.on('slidechanged', event => {
    doMermaidStuff(event);

    let {cast: currentCast, div} = getCurrentCast();
    if(currentCast){
        let playerDiv = div;
        let cast = currentCast;
        if(!playerDiv.children.length) {
            castToPlayer[cast] = createPlayer(cast, playerDiv);
            castToDiv[cast] = playerDiv;
        }
        console.log('register')
        started = false;
        Reveal.addKeyBinding(39, () => null);

        Reveal.addKeyBinding(33, () => null);

        Reveal.addKeyBinding(34, () => null);

        Reveal.addKeyBinding(37, () => null);
        document.addEventListener('keydown', asciinemaControl);
        playerDiv.parentElement.parentElement.style.top = "0px";
    } else {
         document.removeEventListener('keydown', asciinemaControl)
    }


    if (prevCast){
        castToPlayer[prevCast].dispose();
        castToPlayer[prevCast] = createPlayer(prevCast, castToDiv[prevCast]);
        console.log('disposed')
    }
    prevCast = currentCast;
});
