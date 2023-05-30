import papaparse from 'papaparse'

HTMLElement.prototype.$ = function(selector) {
  return this.querySelector(selector)
}

const FeaturesColumn = {
  name: "Nom",
  note: "Note",
  description: "Description",
  complexity: "Simplicité d'implémentation",
  users: "Utilisateurs",
  usefull: "Utilité",
  frequency: "Fréquence d'utilisation",
  score: 'score',
  position: 'position',
  id: 'id',
  relevant: 'Pertinent',
  selected: 'TB',
  obligatory: 'Obligatoire'
}

const Weighting = {
  complexity: 2.5,
  users: 2,
  usefull: 3,
  frequency: 2.5,
}

const MAX_GRADE = 6
const YES = 'oui';

const FullName = {
  "dc + da": "Directeur de centre + directeur adjoint",
  "ede": "Membre de la direction élargie",
  "rs": "Répondant social",
  "rsa": "Responsable administratif",
  "edg": "Membre de la direction générale",
  "msp": "Maître socioprofessionnel",
}

const F = FeaturesColumn;
let features;
let sliderItemsNbr;
let sliderFontSize;
let sliderValueFontSize;
let sliderValueItemsNbr;
let jobs;
let greenFilter;
let bothFilter;
let moreFilter;
let filteringCallback;
let legendPositionElement;

(async () => {
  features = await setData();
  jobs = setJobs(features)
  createHeader(jobs)
  createWall(jobs, features.length)
  createEvents()

  sliderItemsNbr = $(".slider--items-nbr")
  sliderValueItemsNbr = $('.controls__value-items-nbr')
  sliderItemsNbr.setAttribute('max', features.length)
  sliderItemsNbr.setAttribute('value', features.length)
  sliderValueItemsNbr.innerText = features.length

  sliderFontSize = $(".slider--font-size")
  sliderValueFontSize = $('.controls__value-font-size')
  sliderFontSize.addEventListener('input', (e) => {
    $('html').style.setProperty('font-size', `${e.target.value}px`)
    sliderValueFontSize.innerText = `${e.target.value}px`
  })

  const str = "facteur: "
  $('.factor--complexity').dataset.factor = `${str}${Weighting.complexity}`
  $('.factor--frequency').dataset.factor = `${str}${Weighting.frequency}`
  $('.factor--usefull').dataset.factor = `${str}${Weighting.usefull}`
  $('.factor--users').dataset.factor = `${str}${Weighting.users}`

  legendPositionElement = $('.number')
  legendPositionElement.innerText = features.length
  printSelected(features)

  greenFilter = $('.controls__selected--green')
  bothFilter = $('.controls__selected--both');
  moreFilter = $('.controls__selected--more');
  [[moreFilter, more], [greenFilter, isSelectedCard], [bothFilter, isRelevantCard]].forEach(([element, callback], index) => {
    element.addEventListener('click', (e) => {
      const button = e.target;
      const isSelected = button.classList.contains('controls__selected--active')
      isSelected ? button.classList.remove('controls__selected--active') : button.classList.add('controls__selected--active')
      if (index != 0) {
        const otherButton = button == greenFilter ? bothFilter : greenFilter;
        otherButton.classList.remove('controls__selected--active')
        filteringCallback = !isSelected ? callback : undefined;
        refresh(features.length)
        sliderItemsNbr.stepUp(features.length)
      } else {
        callback(isSelected)
      }
    })
  })

  sliderItemsNbr.addEventListener('input', (e) => {
    updateSlider(e.target.value)
    refresh(e.target.value)
  })
})()

function $(selector) {
  return document.querySelector(selector)
}

function $all(selector) {
  return document.querySelectorAll(selector)
}

function isSelectedCard(card) {
  return isStringEqualTo(card[F.selected], YES)
}

function isRelevantCard(card) {
  return isStringEqualTo(card[F.relevant], YES)
}

function more(isMore) {
  const details = $all('details')
  if (isMore) {
    details.forEach((detail) => {
      detail.removeAttribute('open')
    })
  } else {
    details.forEach((detail) => {
      detail.setAttribute('open', true)
    })
  }
}

function refresh(value) {
  const cardsCount = createWall(jobs, value, filteringCallback)
  createEvents()
  updateSlider(cardsCount)
  printSelected(features, value)
}

function printSelected(features, elementNbr) {
  // console.clear()
  // console.log("%cSelected features:", "font-weight: bold; font-size: 16px;")
  // console.table(getSelectedCard(features, elementNbr))
}

function createEvents() {

  $all('.card__content').forEach((card) => {
    card.addEventListener('mouseover', (e) => {
      let element = e.target
      let id = element?.dataset?.id
      while (!id) {
        element = element.parentNode
        id = element?.dataset?.id
      }

      const selectedCards = $all(`[data-id="${id}"]`)
      selectedCards.forEach((card) => {
        card.classList.add('card__content--hover')
      })
    })

    card.addEventListener('mouseleave', () => {
      $all('.card__content').forEach((card) => {
        card.classList.remove('card__content--hover')
      })
    })
  })

  let opened = []
  addEventListener("beforeprint", () => {
    opened = $all('details[open]')
    $all('details').forEach((detail) => {
      detail.setAttribute('open', true)
    })
  });

  addEventListener("afterprint", () => {
    $all('details').forEach((detail) => {
      detail.removeAttribute('open')
    })
    opened.forEach((detail) => {
      detail.setAttribute('open', true)
    })
  });
}

function getSelectedCard(features, elementNbr) {
  const limit = elementNbr || features.length
  return features.filter((feature) => {
    if (isStringEqualTo(feature[F.selected], YES) && feature[F.position] <= limit) return feature
  })
}

function updateSlider(value) {
  sliderValueItemsNbr.innerText = value
  legendPositionElement.innerText = value
}

function setJobs(features) {
  const jobs = {}

  features.forEach((feature) => {
    const jobsList = feature[F.users].split('\n')

    jobsList.forEach((job) => {
      if (jobs[job]) {
        jobs[job].push(feature)
      } else {
        jobs[job] = []
        jobs[job].push(feature)
      }
    })
  })
  return jobs
}

function getScore(feature) {
  const getNumber = (n) => Number(n || 1)
  const sum = [
    getNumber(feature[F.complexity]) * Weighting.complexity,
    getNumber(feature[F.users].split('\n').length) * Weighting.users,
    getNumber(feature[F.usefull]) * Weighting.usefull,
    getNumber(feature[F.frequency]) * Weighting.frequency
  ].reduce((acc, value) => acc + value, 0)
  return Math.trunc((sum / 10) * 100 / MAX_GRADE)
}

function isStringEqualTo(input, reference) {
  if (input.replace(/\s+/g, '').toLowerCase() == reference) return true
  return false
}

function createBulletPoint(string) {
  let parts = string.split("\n")
  parts = parts == "" ? [] : parts
  const bulletPoints = []
  parts.forEach((part) => {
    const li = document.createElement("li");
    li.innerText = part
    bulletPoints.push(li)
  })
  return bulletPoints;
}

async function setData() {
  const response = await fetch("features.csv")
  const csv = await response.text()
  let features = papaparse.parse(csv, {
    header: true,
  })

  features.data.map((feature, index) => {
    feature[F.score] = getScore(feature)
    feature[F.id] = index + 2
    return feature
  })

  features.data.sort((a, b) => {
    if (a.score < b.score) return 1
    if (a.score > b.score) return -1
    return 0
  })

  features.data.map((feature, index) => {
    feature[F.position] = index + 1
    return feature
  })

  return features.data
}

function appendBulletPoints(element, bulletPoints) {
  if (bulletPoints.length === 0) {
    element.style.display = "none"
  } else {
    bulletPoints.forEach(bulletPoint => {
      element.append(bulletPoint)
    })
  }
}

function createCard(feature, card, title) {
  const cardContent = card.$('.card__content')
  card.$(".card__title").textContent = feature[F.name]
  card.$('.card__percentage').innerText = `${feature[F.score]}%`
  card.$('.card__note').innerText = feature[F.note];
  if (feature[F.note] != "") card.$('.card__note').style = "display:flex";
  card.$('.score--complexity text').textContent = feature[F.complexity] || 1
  card.$('.score--users text').textContent = feature[F.users].split('\n').length || 1
  card.$('.score--usefull text').textContent = feature[F.usefull] || 1
  card.$('.score--frequency text').textContent = feature[F.frequency] || 1
  card.$('.card__position').innerText = feature[F.position]
  cardContent.dataset.id = feature.id

  const isObligatory = feature[F.obligatory].split('\n').includes(title)
  if (isObligatory) cardContent.classList.add('obligatory')
  if (isStringEqualTo(feature[F.selected], YES)) {
    cardContent.classList.add('selected')
  } else if (isStringEqualTo(feature[F.relevant], YES)) cardContent.classList.add('relevant')

  const bulletPoints = createBulletPoint(feature[F.description])
  appendBulletPoints(card.$(".card__description"), bulletPoints)

  if (feature[F.description] || feature[F.note]) {
    const details = document.createElement('details')
    const summary = document.createElement('summary')
    const extra = card.$('.card__content--extra')
    const extraClone = extra.cloneNode(true);
    details.appendChild(summary)
    details.appendChild(extraClone)
    extra.replaceWith(details)
  }
  return card;
}

function createHeader(jobs) {
  const headerElement = $('header');
  const jobTemplate = $("#job__template")

  Object.keys(jobs).forEach(title => {
    const job = jobTemplate.content.cloneNode(true)
    job.querySelector('.job__title').textContent = title
    job.querySelector('.job__description').textContent = FullName[title]
    headerElement.append(job)
  })
}

function createWall(jobs, elementsNbr, filterCallback) {
  const wrapperElement = $('#wrapper');
  const cardTemplate = $("#card__template")
  const cardElement = cardTemplate.content.querySelector(".card")
  let uniqCards = new Set();
  wrapperElement.innerHTML = "";

  Object.keys(jobs).forEach(title => {
    const ul = document.createElement("ul")
    ul.dataset.name = title
    ul.dataset.fullName = FullName[title]

    jobs[title].sort((a, b) => {
      if (a.position > b.position) return 1
      if (a.position < b.position) return -1
      return 0
    })

    jobs[title].forEach(feature => {
      const card = cardElement.cloneNode(true)
      if (feature.position <= elementsNbr) {
        const filter = filterCallback != undefined ? filterCallback(feature) : true
        if (filter) {
          uniqCards.add(feature)
          ul.append(createCard(feature, card, title, jobs[title].length))
        }
      }
    })
    wrapperElement.append(ul)
  })
  return uniqCards.size
}
