<br><br>
# Shingo Affiliate Portal API
## Introduction
This project aims to provide REST services to the Shingo Affiliate Portal. Services provided are authentication, CRUD operations for Workhops, CRUD operations for Facilitators, and CRUD operations for Affiliates.

## External Depedancies
The Shingo Affiliate Portal API consumes the [Shingo SF Microservice](https://github.com/shingoinstitute/shingo-sf-api) and the [Shingo Auth Microservice](https://github.com/shingoinstitute/shingo-auth-api).

## Reference
### Workshops
* **[GET:    /workshops](./WorkshopsController.html#readAll__anchor)**
* **[GET:    /workshops/:id](./WorkshopsController.html#read__anchor)**
* **[GET:    /workshops/:id/facilitators](./WorkshopsController.html#facilitators__anchor)**
* **[GET:    /workshops/describe](./WorkshopsController.html#describe__anchor)**
* **[GET:    /workshops/search](./WorkshopsController.html#search__anchor)**
* **[POST:   /workshops](./WorkshopsController.html#create__anchor)**
* **[PUT:    /workshops/:id](./WorkshopsController.html#update__anchor)**
* **[DELETE: /workshops/:id](./WorkshopsController.html#delete__anchor)**

### Facilitators
* **[GET:    /facilitators](./FacilitatorsController.html#readAll__anchor)**
* **[GET:    /facilitators/:id](./FacilitatorsController.html#read__anchor)**
* **[GET:    /facilitators/describe](./FacilitatorsController.html#describe__anchor)**
* **[GET:    /facilitators/search](./FacilitatorsController.html#search__anchor)**
* **[POST:   /facilitators](./FacilitatorsController.html#create__anchor)**
* **[POST:   /facilitators/:id/roles/:roleId](./FacilitatorsController.html#changeRole__anchor)**
* **[PUT:    /facilitators/:id](./FacilitatorsController.html#update__anchor)**
* **[DELETE: /facilitators/:id](./FacilitatorsController.html#delete__anchor)**
* **[DELETE: /facilitators/:id/login](./FacilitatorsController.html#deleteLogin__anchor)**
* **[DELETE: /facilitators/:id/unamp](./FacilitatorsController.html#unmap__anchor)**

### Affiliates
* **[GET:    /affiliates](./AffiliatesController.html#readAll__anchor)**
* **[GET:    /affiliates/:id](./AffiliatesController.html#read__anchor)**
* **[GET:    /affiliates/describe](./AffiliatesController.html#describe__anchor)**
* **[GET:    /affiliates/search](./AffiliatesController.html#search__anchor)**
* **[POST:   /affiliates](./AffiliatesController.html#create__anchor)**
* **[POST:   /affiliates/:id/map](./AffiliatesController.html#map__anchor)**
* **[PUT:    /affiliates/:id](./AffiliatesController.html#update__anchor)**
* **[DELETE: /affiliates/:id](./AffiliatesController.html#delete__anchor)**

### Auth
* **[POST:   /auth/login](./AuthController.html#login__anchor)**
* **[GET:    /auth/logout](./AuthController.html#logout__anchor)**