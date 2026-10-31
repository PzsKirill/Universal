# Реестр ассетов и лицензий

Сюда вносим **каждый** сторонний файл (3D-модели, текстуры, HDRI, фото, видео, звуки, шрифты) **в момент скачивания**.
Скриншот страницы с лицензией кладём в `licenses/` (`<id>.png`): лицензии на сайтах иногда меняются, скриншот — доказательство.
Всё с атрибуцией (CC BY) выводим на странице `/credits` на сайте.

## Правила

| Лицензия | Можно? | Условие |
|---|---|---|
| **CC0 / Public Domain** | ✅ | Ничего не требуется. Указываем автора из вежливости |
| **CC BY** | ✅ | Указать: название, автора, ссылку на источник, лицензию |
| **CC BY-SA** | ⚠️ | Только если готовы отдать свою изменённую версию под той же лицензией |
| **Royalty Free / Standard** (стоки, Fab) | ⚠️ | Сначала читаем условия: в вебе `.glb` скачивается браузером, а некоторые лицензии запрещают отдавать модель в «извлекаемом» виде |
| **CC BY-NC** (некоммерческое) | ❌ | Портфолио для поиска работы и клиентов — серая зона |
| **CC BY-ND** (без изменений) | ❌ | Мы почти всегда меняем материалы, цвета, геометрию |
| **Personal Use / Editorial** | ❌ | Не для публичного портфолио |
| Без указанной лицензии | ❌ | Значит, все права у автора |

**Никаких чужих брендов и персонажей, даже если файл выложен под CC0:** реальные марки машин, iPhone, логотипы, Микки, Луффи и т. п.
Лицензия того, кто загрузил файл, не снимает прав правообладателя, а фан-арт на сайтах с моделями встречается постоянно.

## Реестр

Скриншоты лицензий: `licenses/pexels-license-2026-10-31.png`, `licenses/unsplash-license-2026-10-31.png`.

### LITHIC (`apps/lithic/public/media`)
| id | Файл в проекте | Что | Источник (URL) | Автор | Лицензия | Изменения | Дата |
|---|---|---|---|---|---|---|---|
| L01 | `video/hero.mp4`, `hero-sm.mp4`, `hero-poster.jpg` | Дрон над снежными горами, Норвегия | https://www.pexels.com/video/drone-footage-of-snowy-mountains-in-norway-12037073/ | Traveling on the Go | Pexels | 1600×900 и 1024×576, петля вперёд-назад, без звука, цветокоррекция в шейдере | 31.10.2026 |
| L02 | `video/etch.mp4`, `etch-poster.jpg` | Лазерная резка, искры | https://www.pexels.com/video/high-precision-laser-cutting-in-action-37889019/ | YIHAI LASER | Pexels | Монтаж: 0,25–1,45 с в замедлении 2,5× (искры) + 2,5–4,2 с (свечение резки), кадрирование к лазерной головке, без логотипа станка, 1080p | 31.10.2026 |
| L03 | `video/retrieve.mp4`, `retrieve-poster.jpg` | Учёный у микроскопа | https://www.pexels.com/video/a-scientist-looking-into-a-microscope-8327104/ | Kindel Media | Pexels | 1080p, без звука | 31.10.2026 |
| L04 | `video/expedition.mp4`, `expedition-poster.jpg` | Альпинист на снежном склоне | https://www.pexels.com/video/glacier-desert-frozen-rope-20232369/ | Florian Delée | Pexels | 1080p, 30 fps, без звука | 31.10.2026 |
| L05 | `img/seal.webp` | Тёмный тоннель в скале | https://unsplash.com/photos/a-dimly-lit-cave-tunnel-with-rough-textured-walls-bzcgzKmLO_A | Yosuke Ota | Unsplash | Кадрирование 16:9, WebP | 31.10.2026 |
| L06 | `img/vault.webp` | Освещённый тоннель шахты | https://unsplash.com/photos/illuminated-pathway-through-a-rough-hewn-mine-tunnel-6uVjAEWpm28 | Yosuke Ota | Unsplash | Кадрирование, WebP | 31.10.2026 |
| L07 | `img/use-archives.webp` | Стеллажи с архивными коробками | https://unsplash.com/photos/DsbQdmF2Jzg | T. Selin Erkan | Unsplash | Кадрирование 3:4, WebP | 31.10.2026 |
| L08 | `img/use-libraries.webp` | Тёмная библиотека | https://unsplash.com/photos/RBGIWOZJVU0 | Nikolai Sidorov | Unsplash | Кадрирование 3:4, WebP | 31.10.2026 |
| L09 | `img/use-science.webp` | Склянки с семенами | https://www.pexels.com/photo/close-up-photo-of-glass-bottle-with-seeds-6166831/ | Olha Ruskykh | Pexels | Кадрирование 3:4, WebP | 31.10.2026 |
| L10 | `img/use-families.webp` | Руки листают старый фотоальбом | https://unsplash.com/photos/73OJLcahQHg | Laura Fuhrman | Unsplash | Кадрирование 3:4, WebP | 31.10.2026 |
| L11 | шрифты Archivo, Martian Mono | Шрифты | @fontsource-variable (Google Fonts) | Omnibus-Type; Evil Martians | SIL OFL 1.1 | — | 31.10.2026 |

### Упоминания реальных брендов (не ассеты, а товарные знаки)
LITHIC, блок «Экспедиция»: Norrøna, Bergans, Helly Hansen, Petzl, Mammut, Black Diamond. Решение человека от 31.10.2026, принято после обсуждения рисков. Как оформлено:
- **Только названия, набранные нашим шрифтом.** Фирменные логотипы не скачиваем и не используем.
- **Формулировка о снаряжении**: «экспедиции выходят в снаряжении…», а не «партнёры» или «спонсоры».
- **Явный дисклеймер** рядом с блоком и в подвале: компания вымышленная, связи с брендами нет.
