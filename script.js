document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    // Views
    const mainCategoryView = document.getElementById('main-category-view');
    const subcategoryView = document.getElementById('subcategory-view');
    const comicsView = document.getElementById('comics-view');

    // Grids
    const mainCategoryGrid = document.getElementById('main-category-grid');
    const subcategoryGrid = document.getElementById('subcategory-grid');
    const hqGrid = document.getElementById('hq-grid');

    // Elementos de UI
    const mainSearchBar = document.getElementById('main-search-bar'); // MUDANÇA: Nova barra de pesquisa
    const searchBar = document.getElementById('search-bar');
    const tagsContainer = document.getElementById('tags-container');
    const comicsViewTitle = document.getElementById('comics-view-title');
    const subcategoryViewTitle = document.getElementById('subcategory-view-title');

    // Botões de Voltar
    const backToMainButton = document.getElementById('back-to-main');
    const backToSubButton = document.getElementById('back-to-sub');

    let todasAsHQs = [];
    let hqsDaSubcategoria = [];
    let activeSubFilter = 'Todos';
    let currentMainCategory = '';

    // --- Mapeamento de Categorias Principais ---
    const mainCategories = {
        'DC Comics': ['DC Comics', 'DC Comics (Black Label)', 'DC Comics / Dark Horse Comics', 'Vertigo (DC Comics) / Panini', 'Vertigo (DC Comics)', 'DC Comics / Fleetway', 'DC Comics (Elseworlds)', 'DC Comics / IDW Publishing'],
        'Marvel': ['Marvel Comics'], // Exemplo, adicione mais se necessário
        'Mangás': ['Shueisha', 'Kodansha'] // Exemplo
    };

    // --- Funções de Navegação ---
    function showView(viewToShow) {
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        viewToShow.classList.add('active');
    }

    function showSubcategoryView(mainCategory) {
        currentMainCategory = mainCategory;
        subcategoryViewTitle.textContent = mainCategory;
        const subcategorias = [...new Set(todasAsHQs
            .filter(hq => mainCategories[mainCategory]?.includes(hq.editora))
            .map(hq => hq.editora)
        )];
        renderSubcategories(subcategorias);
        showView(subcategoryView);
    }

    function showComicsView(subcategoria) {
        comicsViewTitle.textContent = subcategoria;
        hqsDaSubcategoria = todasAsHQs.filter(hq => hq.editora === subcategoria);
        
        activeSubFilter = 'Todos';
        searchBar.value = '';
        renderSubFilters(hqsDaSubcategoria);
        renderHQs(hqsDaSubcategoria);
        showView(comicsView);
    }

    // --- Funções de Renderização ---
    function renderMainCategories(filterTerm = '') { // MUDANÇA: Aceita um termo de filtro
        mainCategoryGrid.innerHTML = '';
        const lowerCaseFilter = filterTerm.toLowerCase();

        Object.keys(mainCategories).forEach(categoryName => {
            if (!categoryName.toLowerCase().includes(lowerCaseFilter)) {
                return; // Pula se não corresponder à pesquisa
            }

            const hasComics = todasAsHQs.some(hq => mainCategories[categoryName]?.includes(hq.editora));
            if (!hasComics) return;

            const card = document.createElement('div');
            card.className = 'category-card';
            card.textContent = categoryName;
            card.addEventListener('click', () => showSubcategoryView(categoryName));
            mainCategoryGrid.appendChild(card);
        });
    }

    function renderSubcategories(subcategorias) {
        subcategoryGrid.innerHTML = '';
        subcategorias.forEach(sub => {
            const card = document.createElement('div');
            card.className = 'category-card subcategory-card';
            card.textContent = sub;
            card.addEventListener('click', () => showComicsView(sub));
            subcategoryGrid.appendChild(card);
        });
    }

    function renderHQs(hqs) {
        hqGrid.innerHTML = '';
        if (hqs.length === 0) {
            hqGrid.innerHTML = '<p style="text-align: center;">Nenhuma HQ encontrada.</p>';
            return;
        }
        hqs.forEach(hq => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="cover">${hq.heroi} - ${hq.titulo}</div>
                <div class="info">
                    <div class="title">${hq.titulo}</div>
                    <div class="actions">
                        <button class="card-button btn-desc">DESCRIÇÃO</button>
                        <button class="card-button btn-assistir" data-file-id="${hq.file_id_hq}">LER</button>
                    </div>
                </div>
            `;
            
            card.querySelector('.btn-assistir').addEventListener('click', (e) => {
                e.stopPropagation();
                if (tg.MainButton.isVisible) return;
                tg.MainButton.setText(`A enviar ${hq.titulo}...`);
                tg.MainButton.show();
                tg.sendData(e.currentTarget.dataset.fileId);
            });

            card.querySelector('.btn-desc').addEventListener('click', (e) => {
                e.stopPropagation();
                const details = `Título: ${hq.titulo}\nEditora: ${hq.editora}\nHerói: ${hq.heroi}\nSaga: ${hq.saga}\nAno: ${hq.ano}`;
                tg.showAlert(details);
            });

            hqGrid.appendChild(card);
        });
    }
    
    function renderSubFilters(hqs) {
        const herois = ['Todos', ...new Set(hqs.map(hq => hq.heroi).filter(h => h && h !== "Não especificado" && h !== "N/A"))];
        tagsContainer.innerHTML = '';
        herois.forEach(heroi => {
            const button = document.createElement('button');
            button.className = 'tag-button';
            button.textContent = heroi;
            if (heroi === activeSubFilter) {
                button.classList.add('active');
            }
            button.addEventListener('click', () => {
                activeSubFilter = heroi;
                document.querySelector('#tags-container .tag-button.active')?.classList.remove('active');
                button.classList.add('active');
                searchBar.value = '';
                filterAndRenderHQs();
            });
            tagsContainer.appendChild(button);
        });
    }

    // --- Função de Filtragem ---
    function filterAndRenderHQs() {
        let hqsFiltradas = hqsDaSubcategoria;
        if (activeSubFilter !== 'Todos') {
            hqsFiltradas = hqsFiltradas.filter(hq => hq.heroi === activeSubFilter);
        }
        const termo = searchBar.value.toLowerCase();
        if (termo) {
            hqsFiltradas = hqsFiltradas.filter(hq => 
                hq.titulo.toLowerCase().includes(termo) ||
                hq.saga.toLowerCase().includes(termo)
            );
        }
        renderHQs(hqsFiltradas);
    }

    // --- Carregamento Inicial ---
    fetch('catalogo.json')
        .then(response => response.ok ? response.json() : Promise.reject(response.status))
        .then(data => {
            todasAsHQs = data;
            renderMainCategories();
            showView(mainCategoryView);
        })
        .catch(error => {
            console.error('Erro ao carregar o catálogo:', error);
            mainCategoryGrid.innerHTML = '<p style="text-align: center;">Não foi possível carregar o catálogo.</p>';
        });

    // --- Event Listeners ---
    mainSearchBar.addEventListener('input', (e) => { // MUDANÇA: Evento para a nova barra de pesquisa
        renderMainCategories(e.target.value);
    });
    searchBar.addEventListener('input', filterAndRenderHQs);
    backToMainButton.addEventListener('click', () => showView(mainCategoryView));
    backToSubButton.addEventListener('click', () => showSubcategoryView(currentMainCategory));
});
