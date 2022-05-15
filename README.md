# ENS Records API

Request `/name.eth` or `/0x...` and the API will return the following ENS records:
- description
- avatar (append `?avatar` query to URL)
- url
- telegram
- twitter
- github
- email

It works with ENS names and Ethereum addresses, but is faster with ENS names.

This is probably not the fastest way to fetch the records of an ENS name, but certainly the easiest that I've come across.
