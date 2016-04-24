
def connect_alchemy(url):
	# to connect with alchemy and tag the content 
	from alchemyapi import AlchemyAPI
	alchemyapi 	= AlchemyAPI()

	resp       	= alchemyapi.text('url', url)

	response 	= alchemyapi.keywords("text", resp['text'])

	keywors = response["keywords"]
