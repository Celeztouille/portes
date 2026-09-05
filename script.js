document.addEventListener('DOMContentLoaded', () => {
    const sceneContainer = document.querySelector('.scene');
    const choicesContainer = document.querySelector('.choices');
    const narrationElement = document.querySelector('.narration');
    const prevButton = document.getElementById('btn-prev');
    
    let storyData = null;
    let currentNode = null;
    let currentPhraseIndex = 0;
    let isButtonsDisplayed = false;

    let isFirstNode = true; 
    const firstNode = "000-17";

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
    "white": { bg: "#fff", text: "#000"},
    "black": { bg: "#000", text: "#fff"},
    "yellow": { bg: "#fff", text: "#000", blur:"#ff0"},
    "grey": { bg: "#888", text: "#000", blur:"#fff"},
    "azur" : { bg: "#000", text: "#fff", blur:"rgb(98, 218, 240)"},
    "pink" : { bg: "#fff", text: "#000", blur:"rgb(215, 132, 248)"},
    "indigo" : { bg: "#000", text: "#fff", blur:"rgb(0, 53, 197)"},
    "magenta" :  { bg: "#fff", text: "#000", blur:"rgb(255, 0, 140)"}
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

    
    fetch('story.json')
        .then(response => {
            if (!response.ok) {
                throw new Error("Erreur lors du chargement de l'histoire.");
            }
            return response.json();
        })
        .then(data => {
            storyData = data;
            loadNode(firstNode);
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
        const btnColor = '#4b4bff';
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
            showStartHint();
            isFirstNode = false; 
            historyStack = []; 
            updatePrevButton();
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
        const btnColor = '#4b4bff';
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
                historyStack.push(currentNode.id);
                updatePrevButton();
                loadNode(link.targetId);
            });

            choicesContainer.appendChild(btn);
        });

        // Faire apparaître la zone de choix
        choicesContainer.style.visibility = 'visible';
        choicesContainer.style.opacity = '1';
    }


    function createBackgroundBlur(colorHex, container) {
        // Supprimer un éventuel ancien fond flou
        const oldBlur = document.getElementById('bg-blur-svg');
        if (oldBlur) oldBlur.remove();

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
        stop2.setAttribute('offset', '100%');
        stop2.setAttribute('stop-color', colorHex);
        stop2.setAttribute('stop-opacity', '0'); // Transparent sur les bords

        gradient.appendChild(stop1);
        gradient.appendChild(stop2);
        defs.appendChild(gradient);

        // Cercle utilisant le filtre et le dégradé
        const circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute('cx', '50%');
        circle.setAttribute('cy', '50%');
        circle.setAttribute('r', '20%'); // Rayon du cercle de couleur
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

    function createImageCircle(images, container) {
        const circleContainer = document.createElement('div');
        circleContainer.className = 'image-circle-container';
        circleContainer.style.position = 'relative';
        circleContainer.style.width = '100%';
        //circleContainer.style.height = '400px'; // Hauteur suffisante pour le cercle
        circleContainer.style.display = 'flex';
        circleContainer.style.justifyContent = 'center';
        circleContainer.style.alignItems = 'center';
        circleContainer.style.marginTop = '2rem';

        const radius = 300;

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
            imgWrapper.style.width = '150px';
            imgWrapper.style.height = '150px';
            imgWrapper.style.cursor = 'pointer';
            imgWrapper.style.transition = 'transform 0.3s, filter 0.3s';
            imgWrapper.style.overflow = 'hidden';

            // L'image elle-même
            const img = document.createElement('img');
            img.src = imgData.url;
            img.alt = imgData.alt;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.style.display = 'block';
            img.style.userSelect = 'none';
            img.style.pointerEvents = 'none';

            imgWrapper.appendChild(img);

            // Effet de survol
            imgWrapper.addEventListener('mouseenter', () => {
                imgWrapper.style.transform = 'scale(1.15)';
            });
            imgWrapper.addEventListener('mouseleave', () => {
                imgWrapper.style.transform = 'scale(1)';
            });

            // Gestion du clic
            imgWrapper.addEventListener('click', (e) => {
                e.stopPropagation();
                // Animation de transition
                container.style.opacity = '0';
                setTimeout(() => {
                    historyStack.push(currentNode.id); // Sauvegarde le hub dans l'historique
                    updatePrevButton();
                    loadNode(imgData.targetId);
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