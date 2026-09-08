document.addEventListener('DOMContentLoaded', () => {
    const sceneContainer = document.querySelector('.scene');
    const choicesContainer = document.querySelector('.choices');
    const narrationElement = document.querySelector('.narration');
    const prevButton = document.getElementById('btn-prev');
    const titleScreen = document.getElementById('title-screen');
    const titleButtonsContainer = document.getElementById('title-buttons');
    const confirmPopup = document.getElementById('confirm-popup');
    const btnConfirmYes = document.getElementById('btn-confirm-yes');
    const btnConfirmNo = document.getElementById('btn-confirm-no');
    
    let storyData = null;
    let currentNode = null;
    let currentPhraseIndex = 0;
    let isButtonsDisplayed = false;

    let isFirstNode = true; 
    const firstNode = "000-00";

    let historyStack = []; 

    const inventoryGrid = document.getElementById('inventory-grid');

     const INVENTORY_MAP = {
        "lumiere": 0,
        "tenebres": 1,
        "normalite": 2,
        "occultisme": 3,
        "creation": 4,
        "objet": 5,
        "infini": 6,
        "resilience": 7
    };

    let obtainedItems = [];

    let progressionFlags = {
        "hub04": false, // Déclenché à 4 objets
        "hub06": false, // Déclenché à 6 objets
        "hub08": false  // Déclenché à 8 objets
    };

    let gameCompleted = false;

    const SAVE_KEY = 'portes_save_v1';

    function saveGame() {
        const saveData = {
            obtainedItems: obtainedItems,
            progressionFlags: progressionFlags,
            gameCompleted: gameCompleted,
            savedAt: new Date().toISOString()
        };
        
        localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
        showSaveNotification();
    }

    function loadGame() {
        const savedJSON = localStorage.getItem(SAVE_KEY);
        if (savedJSON) {
            try {
                const saveData = JSON.parse(savedJSON);
                
                // Restaurer les données si elles existent
                if (saveData.obtainedItems) obtainedItems = saveData.obtainedItems;
                if (saveData.progressionFlags) progressionFlags = saveData.progressionFlags;
                if (saveData.gameCompleted !== undefined) gameCompleted = saveData.gameCompleted;
                return true;
            } catch (e) {
                console.error("Erreur lors de la lecture de la sauvegarde:", e);
                return false;
            }
        }
        return false;
    }

    function deleteSave() {
        localStorage.removeItem(SAVE_KEY);
        obtainedItems = [];
        progressionFlags = { "hub04_triggered": false, "hub06_triggered": false, "hub08_triggered": false };
        gameCompleted = false;
    }



    function addToInventory(itemId) {
        if (obtainedItems.includes(itemId)) return;

        const slotIndex = INVENTORY_MAP[itemId];
        
        if (slotIndex === undefined) {
            console.warn(`Objet "${itemId}" non configuré dans l'inventaire.`);
            return;
        }

        obtainedItems.push(itemId);

        const slots = inventoryGrid.querySelectorAll('.slot');
        const targetSlot = slots[slotIndex];

        if (targetSlot) {
            const img = document.createElement('img');
            img.src = `img/${itemId}.png`; 
            img.alt = itemId;
            img.className = 'slot-item';
            targetSlot.innerHTML = '';
            targetSlot.appendChild(img);
        }
    }


    const COLOR_PALETTE = {
    "white": { bg: "#fff", text: "#000", btn:"#00f"},
    "black": { bg: "#000", text: "#fff", btn:"#8989fc"},
    "yellow": { bg: "#fff", text: "#000", btn:"#00f", blur:"#ff0"},
    "purple": { bg: "#000", text: "#fff", btn:"#8989fc", blur:"rgb(111, 0, 255)"},
    "grey": { bg: "#888", text: "#000", btn:"#00f", blur:"#fff"},
    "greynb" : { bg: "#888", text: "#000", btn:"#00f"},
    "azur" : { bg: "#000", text: "#fff", btn:"#8989fc", blur:"rgb(98, 218, 240)"},
    "turquoise" : { bg: "#000", text: "#fff", btn:"#8989fc", blur:"rgb(98, 240, 204)"},
    "pink" : { bg: "#fff", text: "#000", btn:"#00f", blur:"rgb(215, 132, 248)"},
    "indigo" : { bg: "#000", text: "#fff", btn:"#8989fc", blur:"rgb(0, 53, 197)"},
    "magenta" :  { bg: "#fff", text: "#000", btn:"#00f", blur:"rgb(255, 0, 140)"}, 
    "green" :  { bg: "#fff", text: "#000", btn:"#00f", blur:"rgb(22, 139, 18)"}
    };

    function getColors(colorId) {
        return COLOR_PALETTE[colorId] || {
            bg: "#ffffff",
            text: "#333333",
        };
    }

    function updatePrevButton() {
        if (historyStack.length > 0) {
            prevButton.style.display = 'block';
        } else {
            prevButton.style.display = 'none';
        }
    }

    function showStartHint() {
        // Vérifier si un indice existe déjà pour éviter les doublons
        if (document.getElementById('start-hint')) return;

        const hint = document.createElement('div');
        hint.id = 'start-hint';
        hint.textContent = "Clique pour avancer dans l'histoire";
        hint.style.position = 'absolute';
        hint.style.top = '20px';
        hint.style.left = '0';
        hint.style.width = '100%';
        hint.style.textAlign = 'center';
        hint.style.fontStyle = 'italic';
        hint.style.opacity = '0';
        hint.style.pointerEvents = 'none'; // Le clic traverse le texte pour atteindre la scene
        hint.style.transition = 'opacity 0.5s';
        hint.style.fontSize = '0.85em';
        
        // On l'ajoute au conteneur de scène
        sceneContainer.appendChild(hint);

        // Petite animation d'apparition
        setTimeout(() => {
            hint.style.opacity = '1';
        }, 3000);
    }


    function showSaveNotification() {
        // Réutiliser le style de l'indice de départ, mais avec un ID différent
        if (document.getElementById('save-notification')) return;

        const notif = document.createElement('div');
        notif.id = 'save-notification';
        notif.textContent = "Progression sauvegardée";
        notif.style.position = 'absolute';
        notif.style.top = '20px';
        notif.style.left = '0';
        notif.style.width = '100%';
        notif.style.textAlign = 'center';
        notif.style.fontStyle = 'italic';
        notif.style.opacity = '0';
        notif.style.pointerEvents = 'none';
        notif.style.transition = 'opacity 0.5s';
        notif.style.fontSize = '0.85em';
        notif.style.zIndex = '900';
        
        sceneContainer.appendChild(notif);
        
        // Animation d'apparition
        setTimeout(() => {
            notif.style.opacity = '1';
        }, 100);

        // Disparaître après 2 secondes
        setTimeout(() => {
            notif.style.opacity = '0';
            setTimeout(() => {
                if(notif.parentNode) notif.parentNode.removeChild(notif);
            }, 500);
        }, 2000);
    }

    function hideStartHint() {
        const hint = document.getElementById('start-hint');
        if (hint) {
            hint.style.opacity = '0';
            // On supprime l'élément du DOM après la transition
            setTimeout(() => {
                if(hint.parentNode) hint.parentNode.removeChild(hint);
            }, 200);
        }
    }


    function getHubTarget() {
        const itemCount = obtainedItems.length;
        
        if (itemCount >= 4 && !progressionFlags.hub04) {
            progressionFlags.hub04 = true;
            return "HUB-04";
        }
        
        if (itemCount >= 6 && !progressionFlags.hub06) {
            progressionFlags.hub06 = true;
            return "HUB-06";
        }

        if (itemCount >= 8 && !progressionFlags.hub08) {
            progressionFlags.hub08 = true;
            return "HUB-08";
        }

        return "HUB-00";
    }


    function initTitleScreen() {
        const hasSave = loadGame();

        const titleImage = document.querySelector('.title-image');
        if (titleImage && gameCompleted) {
            titleImage.src = "img/door108open.png";
        }
        
        titleButtonsContainer.innerHTML = ''; // Vider le conteneur

        if (hasSave) {
            // CAS 1 : Il y a une sauvegarde
            
            // Bouton Continuer
            const btnContinue = document.createElement('button');
            btnContinue.textContent = "Continuer";
            btnContinue.className = 'title-btn continue';
            btnContinue.addEventListener('click', () => startGame(true)); // true = avec sauvegarde
            titleButtonsContainer.appendChild(btnContinue);

            // Bouton Nouvelle Partie
            const btnNew = document.createElement('button');
            btnNew.textContent = "Nouvelle Partie";
            btnNew.className = 'title-btn';
            btnNew.addEventListener('click', () => showConfirmPopup());
            titleButtonsContainer.appendChild(btnNew);
            
            console.log("Sauvegarde détectée. Affichage des options Continuer/Nouvelle Partie.");
        } else {
            // CAS 2 : Pas de sauvegarde
            
            // Seul bouton Nouvelle Partie (pas de popup)
            const btnNew = document.createElement('button');
            btnNew.textContent = "Nouvelle Partie";
            btnNew.className = 'title-btn';
            btnNew.addEventListener('click', () => startGame(false)); // false = nouvelle partie
            titleButtonsContainer.appendChild(btnNew);
            
            console.log("Aucune sauvegarde. Affichage du bouton Nouvelle Partie uniquement.");
        }
    }

    function showConfirmPopup() {
        confirmPopup.classList.add('active');
    }

    function hideConfirmPopup() {
        confirmPopup.classList.remove('active');
    }

    function startGame(withSave) {
        titleScreen.classList.add('hidden');
        if (storyData) {
            if (withSave) {
                refreshInventoryVisuals();
                loadNode("HUB-00"); 
            } else {
                loadNode(firstNode);
            }
        }
        
    }

    btnConfirmYes.addEventListener('click', () => {
        deleteSave(); // Efface la sauvegarde disque et mémoire
        hideConfirmPopup();
        startGame(false); // Lance une nouvelle partie
    });

    btnConfirmNo.addEventListener('click', () => {
        hideConfirmPopup(); // Annule l'action
    });

    function refreshInventoryVisuals() {
        // Vider l'inventaire actuel
        inventoryGrid.innerHTML = '';
        // Recréer les slots
        for (let i = 0; i < 8; i++) {
            const slot = document.createElement('div');
            slot.className = 'slot';
            // Retrouver l'ID correspondant à l'index (inverse du map)
            const itemId = Object.keys(INVENTORY_MAP).find(key => INVENTORY_MAP[key] === i);
            if (itemId) slot.dataset.id = itemId;
            inventoryGrid.appendChild(slot);
        }

        // Remplir avec les objets sauvegardés
        obtainedItems.forEach(itemId => {
            const slotIndex = INVENTORY_MAP[itemId];
            if (slotIndex !== undefined) {
                const slots = inventoryGrid.querySelectorAll('.slot');
                const targetSlot = slots[slotIndex];
                if (targetSlot && !targetSlot.querySelector('img')) {
                    const img = document.createElement('img');
                    img.src = `img/${itemId}.png`;
                    img.className = 'slot-item';
                    img.alt = itemId;
                    targetSlot.appendChild(img);
                }
            }
        });
    }

    
    fetch('story.json')
        .then(response => {
            if (!response.ok) {
                throw new Error("Erreur lors du chargement de l'histoire.");
            }
            return response.json();
        })
        .then(data => {
            storyData = data;
            initTitleScreen();
        })
        .catch(error => {
            console.error(error);
            narrationElement.innerHTML = `<p>Erreur : Impossible de charger l'histoire. Assure-toi que le fichier story.json est dans le même dossier et que tu lances la page via un serveur local (pas en double-cliquant sur le fichier HTML).</p>`;
            choicesContainer.innerHTML = '';
        });

    
    function loadNode(nodeId) {
        if (!storyData) return;

       
        const node = storyData.nodes.find(n => n.id === nodeId);

        if (!node) {
            console.error(`Node "${nodeId}" introuvable.`);
            return;
        }

        currentNode = node;
        currentPhraseIndex = 0;
        isButtonsDisplayed = false;

        const colors = getColors(node.colorId);
        document.body.style.backgroundColor = colors.bg;
        document.body.style.color = colors.text;
        const btnColor = colors.btn;
        document.documentElement.style.setProperty('--choice-color', btnColor);

        narrationElement.innerHTML = '';
        choicesContainer.style.visibility = 'hidden';
        choicesContainer.style.opacity = 0;

        const oldCircle = document.querySelector('.image-circle-container');
        if (oldCircle) {
            oldCircle.remove();
        }

        if (colors.blur) {
            createBackgroundBlur(colors.blur, sceneContainer);
        } else {
            const oldBlur = document.getElementById('bg-blur-svg');
            if (oldBlur) oldBlur.remove();
        }

        if (isFirstNode) {
            isFirstNode = false; 
            historyStack = []; 
            updatePrevButton();
        }

        if (node.setGlobalFlag) {
            if (node.setGlobalFlag === "gameCompleted") {
                gameCompleted = true;
                saveGame();
            }
        }

        if (nodeId === "000-00")
        {
            showStartHint();
        }

        if (nodeId === "HUB-00" && historyStack.length > 0) {
            saveGame();
        }

        if (node.images && node.images.length > 0) {
            // Si c'est un hub, on affiche tout le texte d'un coup (pas de clic par clic)
            // et on génère le cercle d'images immédiatement.
            node.narration.forEach(text => {
                const p = document.createElement('p');
                p.className = 'narration';
                p.textContent = text;
                p.style.position = 'relative';
                p.style.opacity = '1'; // Pas d'animation progressive pour le hub
                narrationElement.appendChild(p);
            });
            createImageCircle(node.images, sceneContainer);
            
            isButtonsDisplayed = true; 
            sceneContainer.style.cursor = 'default';
        } else {
            displayNextPhrase();
        }
    }


    function goBack() {
        if (historyStack.length === 0) return;

        const previousNodeId = historyStack.pop(); // On retire le dernier élément
        updatePrevButton();
        
        const node = storyData.nodes.find(n => n.id === previousNodeId);
        if (!node) return;

        // On duplique la logique d'affichage de loadNode mais sans toucher à l'historique
        currentNode = node;
        currentPhraseIndex = 0;
        isButtonsDisplayed = false;
        isFirstNode = false;

        const oldCircle = document.querySelector('.image-circle-container');
        if (oldCircle) {
            oldCircle.remove();
        }

        const colors = getColors(node.colorId);
        document.body.style.backgroundColor = colors.bg;
        document.body.style.color = colors.text;
        const btnColor = colors.btn;
        document.documentElement.style.setProperty('--choice-color', btnColor);

        if (colors.blur) {
            createBackgroundBlur(colors.blur, sceneContainer);
        } else {
            const oldBlur = document.getElementById('bg-blur-svg');
            if (oldBlur) oldBlur.remove();
        }


        narrationElement.innerHTML = '';
        choicesContainer.style.visibility = 'hidden';
        choicesContainer.style.opacity = 0;
        
        if (node.images && node.images.length > 0) {
            // Si c'est un hub, on affiche tout le texte d'un coup (pas de clic par clic)
            // et on génère le cercle d'images immédiatement.
            node.narration.forEach(text => {
                const p = document.createElement('p');
                p.className = 'narration';
                p.textContent = text;
                p.style.position = 'relative';
                p.style.opacity = '1'; // Pas d'animation progressive pour le hub
                narrationElement.appendChild(p);
            });
            createImageCircle(node.images, sceneContainer);
            
            isButtonsDisplayed = true; 
            sceneContainer.style.cursor = 'default';
        } else {
            displayNextPhrase();
        }
    }

    function displayNextPhrase()
    {
        if (!currentNode) return;

        if (currentPhraseIndex >= currentNode.narration.length && !isButtonsDisplayed) {
            showButtons();
            return;
        }

        if (currentPhraseIndex >= currentNode.narration.length) {
            return;
        }

        const content = currentNode.narration[currentPhraseIndex];
        const imageRegex = /^\{img:(.+)\}$/;
        const match = content.match(imageRegex);

        let element;

        if (match) {
            // C'est une image !
            const imageName = match[1];
            
            element = document.createElement('img');
            element.src = imageName;
            element.alt = "Illustration de l'histoire";
            element.className = 'story-image'; 
            
            element.style.maxWidth = '100%';
            element.style.height = '48px';
            element.style.display = 'block';
            element.style.margin = '1rem auto'; 
            element.style.opacity = '0';
            element.style.userSelect = 'none';

            if (currentNode.getItem) {
                addToInventory(currentNode.getItem);
            }
            
        } else {
            // C'est du texte normal
            element = document.createElement('p');
            element.className = 'narration';
            element.textContent = content;
            element.style.opacity = '0';
            element.style.position = 'relative';
            element.style.zIndex = '1';
        }

        narrationElement.appendChild(element);
        
        // Force le reflow pour que la transition CSS fonctionne
        void element.offsetWidth; 
        element.style.transition = "opacity 0.5s";
        element.style.opacity = '1';

        currentPhraseIndex++;
    }

    function showButtons() {
        if (isButtonsDisplayed) return;
        isButtonsDisplayed = true;

        choicesContainer.innerHTML = ''; // Vider les anciens boutons

        currentNode.links.forEach(link => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.textContent = '>> ' + link.label;
            
            btn.addEventListener('click', (e) => {
                e.stopPropagation();

                let targetId = link.targetId;

                if (link.targetId === "TITLE") {
                    restartGame();
                    return;
                }

                if (link.targetId === "HUB-00") {
                    targetId = getHubTarget();
                }

                historyStack.push(currentNode.id);
                updatePrevButton();
                loadNode(targetId);
            });

            choicesContainer.appendChild(btn);
        });

        // Faire apparaître la zone de choix
        choicesContainer.style.visibility = 'visible';
        choicesContainer.style.opacity = '1';
    }

    function restartGame() {

        const titleImage = document.querySelector('.title-image');
        if (titleImage && gameCompleted) {
            titleImage.src = "img/door108open.png";
        }

        obtainedItems = [];
        progressionFlags = { 
            "hub04_triggered": false,
            "hub06_triggered": false,
            "hub08_triggered": false
        };
        historyStack = []; 
        updatePrevButton(); 
        
        
        narrationElement.innerHTML = '';
        choicesContainer.innerHTML = '';
        choicesContainer.style.visibility = 'hidden';
        choicesContainer.style.opacity = '0';
        
        const oldCircle = document.querySelector('.image-circle-container');
        if (oldCircle) oldCircle.remove();
        
        const oldBlur = document.getElementById('bg-blur-svg');
        if (oldBlur) oldBlur.remove();

        
        const titleScreen = document.getElementById('title-screen');
        if (titleScreen) {
            titleScreen.classList.remove('hidden'); 
        }
    }


    function createBackgroundBlur(colorHex, container) {
        // Supprimer un éventuel ancien fond flou
        const oldBlur = document.getElementById('bg-blur-svg');
        if (oldBlur) oldBlur.remove();

        const isMobile = window.innerWidth < 600;
        const circleRadius = isMobile ? '50%' : '20%';


        // Création de l'élément SVG
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.id = 'bg-blur-svg';
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none'; // Le clic traverse le SVG
        svg.style.zIndex = '0'; // Derrière le texte

        // Définition du filtre de flou
        const defs = document.createElementNS(svgNS, "defs");
        const filter = document.createElementNS(svgNS, "filter");
        filter.setAttribute('id', 'gaussianBlur');
        
        const feGaussianBlur = document.createElementNS(svgNS, "feGaussianBlur");
        feGaussianBlur.setAttribute('stdDeviation', '40'); // Intensité du flou (à ajuster)
        
        filter.appendChild(feGaussianBlur);
        defs.appendChild(filter);
        svg.appendChild(defs);

        // Création du dégradé radial
        const gradient = document.createElementNS(svgNS, "radialGradient");
        gradient.setAttribute('id', 'blurGradient');
        gradient.setAttribute('cx', '50%');
        gradient.setAttribute('cy', '50%');
        gradient.setAttribute('r', '50%');

        // Stop central (couleur pleine)
        const stop1 = document.createElementNS(svgNS, "stop");
        stop1.setAttribute('offset', '0%');
        stop1.setAttribute('stop-color', colorHex);
        stop1.setAttribute('stop-opacity', '0.6'); // Opacité au centre

        // Stop externe (transparent)
        const stop2 = document.createElementNS(svgNS, "stop");
        stop2.setAttribute('offset', isMobile ? '50%' : '100%');
        stop2.setAttribute('stop-color', colorHex);
        stop2.setAttribute('stop-opacity', '0'); // Transparent sur les bords

        gradient.appendChild(stop1);
        gradient.appendChild(stop2);
        defs.appendChild(gradient);

        // Cercle utilisant le filtre et le dégradé
        const circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute('cx', '50%');
        circle.setAttribute('cy', '50%');
        circle.setAttribute('r', '20%');
        circle.setAttribute('fill', 'url(#blurGradient)');
        circle.setAttribute('filter', 'url(#gaussianBlur)');

        svg.appendChild(circle);

        // Ajout au conteneur (on l'ajoute à sceneContainer pour qu'il soit centré)
        // On s'assure qu'il est inséré AVANT le texte pour être en arrière-plan
        const narrationElement = container.querySelector('.narration');
        if (narrationElement) {
            container.insertBefore(svg, narrationElement);
        } else {
            container.appendChild(svg);
        }
    }

    function getDynamicTarget(baseTargetId, itemCount) {
        // Règle Porte 3
        if (baseTargetId === "003-00b") {
            return (itemCount >= 6) ? "003-00" : "003-00b";
        }
        
        // Règle Porte 13
        if (baseTargetId === "013-00b") {
            return (itemCount >= 6) ? "013-00" : "013-00b";
        }

        // Règle Porte 999
        if (baseTargetId === "999-00b") {
            return (itemCount >= 4) ? "999-00" : "999-00b";
        }

        // Règle Porte 107
        if (baseTargetId === "107-00b") {
            return (itemCount >= 4) ? "107-00" : "107-00b";
        }

        // Règle Porte 108
        if (baseTargetId === "000-00") {
            return (itemCount >= 8) ? "108-00" : "000-00";
        }

        return baseTargetId;
    }

    function createImageCircle(images, container) {
        const circleContainer = document.createElement('div');
        circleContainer.className = 'image-circle-container';
        circleContainer.style.position = 'relative';
        circleContainer.style.width = '100%';
        circleContainer.style.display = 'flex';
        circleContainer.style.justifyContent = 'center';
        circleContainer.style.alignItems = 'center';
        circleContainer.style.marginTop = '2rem';

        const radius = 300;
        const itemCount = obtainedItems.length;

        images.forEach((imgData, index) => {
            const imgWrapper = document.createElement('div');
            imgWrapper.className = 'hub-image-wrapper';
            
            // Calcul de la position en cercle
            // On divise 360 degrés (2*PI) par le nombre d'images
            const angle = (index * (2 * Math.PI / images.length)) - Math.PI / 2; 
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            // Positionnement absolu centré
            imgWrapper.style.position = 'absolute';
            imgWrapper.style.left = `calc(50% + ${x}px - 75px)`; // -75px car l'image fait 150px de large (moitié)
            imgWrapper.style.top = `calc(50% + ${y}px - 75px)`;
            
            // Style de l'image
            imgWrapper.style.width = '180px';
            imgWrapper.style.height = '180px';
            imgWrapper.style.cursor = 'pointer';
            imgWrapper.style.transition = 'transform 0.3s, filter 0.3s';
            imgWrapper.style.overflow = 'hidden';


            let imgUrl = imgData.url;
            if (imgUrl === "img/door108.png" && itemCount >= 8)
            {
                imgUrl = "img/door108open.png"
            }

            // L'image elle-même
            const img = document.createElement('img');
            img.src = imgUrl;
            img.alt = imgData.alt;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.style.display = 'block';
            img.style.userSelect = 'none';
            img.style.pointerEvents = 'none';

            imgWrapper.appendChild(img);

            // Gestion du clic
            imgWrapper.addEventListener('click', (e) => {
                e.stopPropagation();

                let finalTargetId = getDynamicTarget(imgData.targetId, itemCount);

                // Animation de transition
                container.style.opacity = '0';
                setTimeout(() => {
                    historyStack.push(currentNode.id); // Sauvegarde le hub dans l'historique
                    updatePrevButton();
                    loadNode(finalTargetId);
                    container.style.opacity = '1';
                }, 300);
            });

            circleContainer.appendChild(imgWrapper);
        });

        container.appendChild(circleContainer);
    }
        
    sceneContainer.addEventListener('click', (e) => {
        if (isButtonsDisplayed) return;
        if (e.target.tagName === 'A') return;

        hideStartHint();
        displayNextPhrase();
    });

    prevButton.addEventListener('click', (e) => {
        e.stopPropagation();
        goBack();
    });
});