<br><br>
# Shingo Affiliate Portal API
## Introduction
This project aims to provide REST services to the Shingo Affiliate Portal. Services provided are authentication, CRUD operations for Workhops, CRUD operations for Facilitators, and CRUD operations for Affiliates.

## External Depedancies
The Shingo Affiliate Portal API consumes the [Shingo SF Microservice](https://github.com/shingoinstitute/shingo-sf-api) and the [Shingo Auth Microservice](https://github.com/shingoinstitute/shingo-auth-api).

## Reference
### Workshops
* **[GET:    /workshops](./WorkshopsController.html#readAll__anchor)**
* **[GET:    /workshops/:id](./WorkshopsController.html#read__anchor)** -- Protected by [IsValidMiddleware](./IsValidMiddleware.html) and [AuthMiddleware](./AuthMiddleware.html)
* **[GET:    /workshops/:id/facilitators](./WorkshopsController.html#facilitators__anchor)** -- Protected by [IsValidMiddleware](./IsValidMiddleware.html) and [AuthMiddleware](./AuthMiddleware.html)
* **[GET:    /workshops/describe](./WorkshopsController.html#describe__anchor)** -- Protected by [IsValidMiddleware](./IsValidMiddleware.html)
* **[GET:    /workshops/search](./WorkshopsController.html#search__anchor)** -- Protected by [IsValidMiddleware](./IsValidMiddleware.html)
* **[POST:   /workshops](./WorkshopsController.html#create__anchor)** -- Protected by [IsValidMiddleware](./IsValidMiddleware.html) and [AuthMiddleware](./AuthMiddleware.html)
* **[PUT:    /workshops/:id](./WorkshopsController.html#update__anchor)** -- Protected by [IsValidMiddleware](./IsValidMiddleware.html) and [AuthMiddleware](./AuthMiddleware.html)
* **[DELETE: /workshops/:id](./WorkshopsController.html#delete__anchor)** -- Protected by [IsValidMiddleware](./IsValidMiddleware.html) and [AuthMiddleware](./AuthMiddleware.html)

### Facilitators
* **[GET:    /facilitators](./FacilitatorsController.html#readAll__anchor)** -- Protected by [IsValidMiddleware](./IsValidMiddleware.html) and [AuthMiddleware](./AuthMiddleware.html)
* **[GET:    /facilitators/:id](./FacilitatorsController.html#read__anchor)** -- Protected by [IsValidMiddleware](./IsValidMiddleware.html) and [AuthMiddleware](./AuthMiddleware.html)
* **[GET:    /facilitators/describe](./FacilitatorsController.html#describe__anchor)** -- Protected by [IsValidMiddleware](./IsValidMiddleware.html) and [AuthMiddleware](./AuthMiddleware.html)
* **[GET:    /facilitators/search](./FacilitatorsController.html#search__anchor)** -- Protected by [IsValidMiddleware](./IsValidMiddleware.html) and [AuthMiddleware](./AuthMiddleware.html)
* **[POST:   /facilitators](./FacilitatorsController.html#create__anchor)** -- Protected by [IsValidMiddleware](./IsValidMiddleware.html) and [IsAFManMiddleware](./IsAFManMiddleware.html)
* **[POST:   /facilitators/:id/roles/:roleId](./FacilitatorsController.html#changeRole__anchor)** -- Protected by [IsValidMiddleware](./IsValidMiddleware.html) and [IsAFManMiddleware](./IsAFManMiddleware.html)
* **[PUT:    /facilitators/:id](./FacilitatorsController.html#update__anchor)** -- Protected by [IsValidMiddleware](./IsValidMiddleware.html) and [IsAFManMiddleware](./IsAFManMiddleware.html)
* **[DELETE: /facilitators/:id](./FacilitatorsController.html#delete__anchor)** -- Protected by [IsValidMiddleware](./IsValidMiddleware.html) and [IsAFManMiddleware](./IsAFManMiddleware.html)
* **[DELETE: /facilitators/:id/login](./FacilitatorsController.html#deleteLogin__anchor)** -- Protected by [IsValidMiddleware](./IsValidMiddleware.html) and [IsAFManMiddleware](./IsAFManMiddleware.html)
* **[DELETE: /facilitators/:id/unamp](./FacilitatorsController.html#unmap__anchor)** -- Protected by [IsValidMiddleware](./IsValidMiddleware.html) and [IsAFManMiddleware](./IsAFManMiddleware.html)

### Affiliates
* **[GET:    /affiliates](./AffiliatesController.html#readAll__anchor)**
* **[GET:    /affiliates/:id](./AffiliatesController.html#read__anchor)** -- Protected by [IsValidMiddleware](./IsValidMiddleware.html) and [AuthMiddleware](./AuthMiddleware.html)
* **[GET:    /affiliates/:id/coursemanagers](./AffiliatesController.html#searchCMS__anchor)** -- Protected by [IsValidMiddleware](./IsValidMiddleware.html) and [AuthMiddleware](./AuthMiddleware.html)
* **[GET:    /affiliates/describe](./AffiliatesController.html#describe__anchor)** -- Protected by [IsValidMiddleware](./IsValidMiddleware.html) and [IsAFManMiddleware](./IsAFManMiddleware.html)
* **[GET:    /affiliates/search](./AffiliatesController.html#search__anchor)** -- Protected by [IsValidMiddleware](./IsValidMiddleware.html) and [IsAFManMiddleware](./IsAFManMiddleware.html)
* **[POST:   /affiliates](./AffiliatesController.html#create__anchor)** -- Protected by [IsValidMiddleware](./IsValidMiddleware.html) and [IsAFManMiddleware](./IsAFManMiddleware.html)
* **[POST:   /affiliates/:id/map](./AffiliatesController.html#map__anchor)** -- Protected by [IsValidMiddleware](./IsValidMiddleware.html) and [IsAFManMiddleware](./IsAFManMiddleware.html)
* **[PUT:    /affiliates/:id](./AffiliatesController.html#update__anchor)** -- Protected by [IsValidMiddleware](./IsValidMiddleware.html) and [IsAFManMiddleware](./IsAFManMiddleware.html)
* **[DELETE: /affiliates/:id](./AffiliatesController.html#delete__anchor)** -- Protected by [IsValidMiddleware](./IsValidMiddleware.html) and [IsAFManMiddleware](./IsAFManMiddleware.html)

### Auth
* **[POST:   /auth/login](./AuthController.html#login__anchor)**
* **[POST:   /auth/valid](./AuthController.html#valid__anchor)** -- Protected by [IsValidMiddleware](./IsValidMiddleware.html)
* **[GET:    /auth/logout](./AuthController.html#logout__anchor)** -- Protected by [IsValidMiddleware](./IsValidMiddleware.html)