const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
function closeMenu() {
  navigation.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
}
menuButton?.addEventListener('click', () => {
  const expanded = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!expanded));
  navigation.classList.toggle('open', !expanded);
});
navigation?.addEventListener('click', event => {
  if (event.target.closest('a')) closeMenu();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && navigation?.classList.contains('open')) {
    closeMenu();
    menuButton.focus();
  }
});
const photos = [
  [6, '牌楼下的韩家村', 'landmark'],
  [2, '牌楼前，乡亲相聚', 'event'],
  [8, '石牌门楼落成典礼上的发言', 'event'],
  [14, '村史在手，乡情在心', 'event'],
  [5, '石碑上的村庄寄愿', 'landmark'],
  [3, '一起见证村庄的喜悦', 'event'],
  [1, '熟悉的乡亲，亲切的笑脸', 'people'],
  [19, '村史发行与门楼落成活动', 'event'],
  [4, '书法里的文化祝愿', 'landmark'],
  [9, '一场相聚，一份乡情', 'event'],
  [7, '翰墨寄情', 'landmark'],
  [10, '舞台上的文化时刻', 'people'],
  [11, '相聚时的乡亲留影', 'people'],
  [12, '镜头里的乡亲风采', 'people'],
  [13, '乡音里的故土情怀', 'people'],
  [15, '共话村庄文化', 'people'],
  [16, '把乡情讲给大家', 'people'],
  [17, '相聚的笑容', 'people'],
  [18, '为故乡留下记忆', 'people']
].map(([number, title, category]) => ({ src: `assets/photos/memory-${String(number).padStart(2, '0')}.webp`, title, category }));
const categories = { landmark: '村庄印记', event: '文化相聚', people: '乡亲风采' };
const grid = document.querySelector('#photo-grid');
const moreButton = document.querySelector('#more-photos');
const lightbox = document.querySelector('#lightbox');
let filter = 'all';
let expanded = false;
let selected = 0;
let filteredPhotos = photos;
let opener;
function showPhoto(index) {
  selected = (index + filteredPhotos.length) % filteredPhotos.length;
  const photo = filteredPhotos[selected];
  const img = document.querySelector('#lightbox-image');
  img.src = photo.src;
  img.alt = photo.title;
  document.querySelector('#lightbox-caption').textContent = photo.title;
  document.querySelector('#photo-count').textContent = `${selected + 1} / ${filteredPhotos.length}`;
}
function renderGallery() {
  filteredPhotos = photos.filter(photo => filter === 'all' || photo.category === filter);
  grid.replaceChildren();
  const visible = expanded ? filteredPhotos : filteredPhotos.slice(0, 6);
  visible.forEach((photo, index) => {
    const button = document.createElement('button');
    button.className = 'photo-card';
    button.setAttribute('aria-label', `查看大图：${photo.title}`);
    const wrap = document.createElement('span');
    wrap.className = 'photo-wrap';
    const img = document.createElement('img');
    img.src = photo.src;
    img.alt = photo.title;
    img.loading = 'lazy';
    img.width = 1800;
    img.height = 1200;
    const zoom = document.createElement('span');
    zoom.className = 'zoom-hint';
    zoom.textContent = '+';
    zoom.setAttribute('aria-hidden', 'true');
    wrap.append(img, zoom);
    const title = document.createElement('span');
    title.className = 'photo-title';
    title.textContent = photo.title;
    const category = document.createElement('span');
    category.className = 'photo-category';
    category.textContent = categories[photo.category];
    button.append(wrap, title, category);
    button.addEventListener('click', () => {
      opener = button;
      showPhoto(index);
      lightbox.showModal();
      document.body.style.overflow = 'hidden';
    });
    grid.append(button);
  });
  moreButton.hidden = filteredPhotos.length <= 6;
  moreButton.textContent = expanded ? '收起影像' : `展开更多影像（共 ${filteredPhotos.length} 张）`;
  moreButton.setAttribute('aria-expanded', String(expanded));
}
if (grid) {
  renderGallery();
  document.querySelectorAll('[data-filter]').forEach(button => {
    button.addEventListener('click', () => {
      filter = button.dataset.filter;
      expanded = false;
      document.querySelectorAll('[data-filter]').forEach(item => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      renderGallery();
    });
  });
  moreButton.addEventListener('click', () => {
    expanded = !expanded;
    renderGallery();
    if (!expanded) document.querySelector('.filters').scrollIntoView({ block: 'start' });
  });
  document.querySelector('.close-dialog').addEventListener('click', () => lightbox.close());
  lightbox.addEventListener('click', event => {
    if (event.target === lightbox) {
      const rect = lightbox.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) lightbox.close();
    }
  });
  lightbox.addEventListener('close', () => {
    document.body.style.overflow = '';
    opener?.focus();
  });
  document.querySelector('#previous-photo').addEventListener('click', () => showPhoto(selected - 1));
  document.querySelector('#next-photo').addEventListener('click', () => showPhoto(selected + 1));
  lightbox.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') showPhoto(selected - 1);
    if (event.key === 'ArrowRight') showPhoto(selected + 1);
  });
}
