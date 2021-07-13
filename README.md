# box-chat

Projekt serwisu internetowego, którego główną funkcjonalnościami jest chat, podzielony na pokoje oraz czat z możliwością pisania z losowymi osobami.

## Wykorzystano:
- Node.js
- Express
- express-session
- express-validator
- socket.io
- MongoDB
- mongoose
- redis
- bcrypt
- js-cookie
- jquery

## Plan (podzielony na sprinty):

### Sprint 1:

#### - System rejestracyjny oraz logowania:

- [x] Prosty formularz rejestracyjny [login, mail, hasło] z captchą    
- [x] Formularz logowania 
- [ ] Odzyskiwanie hasła

#### - Czat:

- [x] Lista pokojów pobierana z bazy danych
- [x] Prosty czat podzielony na pokoje

### Sprint 2:

#### Rozbudowa czatu:

- [ ] Prywatne wiadomości:

  - W formie oddzielnego okienka [?]
  - W formie wyświetlania wiadomości w czacie na którym jesteście

- [ ] Administrowanie wiadomości
- [ ] Własne pokoje

#### Czat z przypadkowymi osobami

### Sprint 3:

#### Obsługa języków:

- [ ] Wybór języka wszystkich wiadomości (translate)
- [ ] Pokoje z dozwolonym tylko jednym językiem pisania

#### Rozbudowa czatu z przypadkowymi osobami:

- [ ] Preferencje wyszukiwania:

  - [ ] Wiek
  - [ ] Płeć

#### Rozbudowa kont o profile:

- [ ] Lista znajomych
- [ ] Ulubione pokoje
- [ ] Opisy/Statusy
- [ ] Zdjęcia profilowe
   