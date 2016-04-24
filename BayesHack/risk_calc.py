from pymongo import MongoClient
from alchemyapi_python.alchemyapi import AlchemyAPI
import datetime
import operator

# for language processing stuff
from spacy.en import English
nlp = English()

def mongo_connect():
	# production MongoDB connect
	global db
	client 		= MongoClient('mongodb://admin:godis1@ds045454.mlab.com:45454/targetedprevention2')
	db   		= client.targetedprevention2



def get_pagetracks():
	# fetch page tracks pushed by our web trackers to analyze content
	docs = []
	for d in db.pagetracking.find().sort("date",-1):
		docs.append(d)

	return docs


def create_user_profile(id_, tags):
	# insert processed information to user profile collection
	db.userprofile.insert_one( {"id": id_, "tags": tags, "createdAt":datetime.datetime.utcnow()} )
	#db.pagetracking.update({'id'  	: id_}, {'$set'	: {"tags":tags } } )



def regression_risk():
	# regresssion models from R (results are imported here)
	'''
	#MODEL FOR SMOKING
	fit_cig <- glm(da35509.0001$SUICTHNK ~ da35509.0001$CIGEVER, data=da35509.0001, family="binomial")

	#MODEL FOR Marijuana
	fit_mar <- glm(da35509.0001$SUICTHNK ~ da35509.0001$MJEVER, data=da35509.0001, family="binomial")

	#MODEL FOR COCAIN
	fit_coc <- glm(da35509.0001$SUICTHNK ~ da35509.0001$COCEVER, data=da35509.0001, family="binomial")
	'''
	# Results imported from R (logistic regression)
	keyword_risk = {u"smoking":1.6, u"marijuana":1.98, u"cocain":1.9, u"suicide":2.0}
	return keyword_risk


def extract_text_alchemy(url):
	# for content processing
	# to connect with alchemy and tag the content 
	alchemyapi 	= AlchemyAPI()

	resp       	= alchemyapi.text('url', url)

	response 	= alchemyapi.keywords("text", resp['text'])

	if "keywords" in response.keys():
		keywords 	= response["keywords"]
	else:
		print "No parsed data: ", url
		print response
		keywords = []

	return keywords


def demographic_adjusted_R(input_vec = "c(1,0,0,1,1,0,0)" ):
	''' this functino calls an R function and passes 
	variable order: male, female, age>50, age<50, married, not married, isVeteran
	example: calcM(c(1,0,0,1,1,0,0))
	'''
	from rpy2.robjects.packages import importr
	import rpy2.robjects as ro

	r_function = '''
	calcM = function(demo)
{
  mult.vet = c(1.39, 0.61, 1.4, 0.7, 0.8, 1.2)
  mult.nonvet = c(1.23, 0.77, 0.68, 1.32, 0.75, 1.25)
  c = 0.3
  
  if(demo[7] == 0) mult = data.frame(adjustment = mult.nonvet)
  else mult = data.frame(adjustment = mult.vet)
  mult$variable = c("sex", "sex", "age", "age", "marriage", "marriage")
  
  #maximum and minimum possible score
  max = prod(tapply(mult$adjustment, mult$variable, max))
  min = prod(tapply(mult$adjustment, mult$variable, min))
  #original score, multiplication of all applicable multipliers
  score.ori = mult$adjustment*demo[1:6]
  score.ori = prod(score.ori[score.ori != 0]) 
  #scaled score, range from 0 to 2
  score.scl = ifelse(score.ori > 1, (score.ori-1)/(max-1) + 1, score.ori)
  #adjusted score, adjusted by our confidence parameter
  score.adj = (score.scl-1)*c + 1
  score.adj
}
'''
	ro.r('setwd("/Users/pouria/Bay_Hackathan/")')
	ro.r('load("ICPSR_35509/DS0001/35509-0001-Data.rda")')
	ro.r(r_function)
	a = ro.r('calcM(c(1,0,0,1,1,0,0))')
	print a


def guess_demographic(doc):
	''' this function tries to guess the demographic information of the user:
	age, gender, relationship, and veteran or not 
	'''

	# for now I will just created two cases based on the url!
	if doc["page"] == "http://www.medicinenet.com/alcohol_abuse_and_alcoholism/article.htm":
		vector = "c(1,0,0,1,1,0,0)" # this is a vector for R
	else:
		vector = "c(1,0,0,1,1,0,0)" 

	return vector


def main():
	# connect the database
	mongo_connect()  

	# get the records:
	docs = get_pagetracks()

	#load the keyword risks
	keyword_risk = regression_risk()


	#extract content and calculate risk
	for doc in docs:
		if doc["id"] == "b8d6e4f2-ebbb-4c0d-8e6d-9153d34abbd2":
			print doc["page"]
			document_risks = []  			#risk of the document read by the user
			keywords = extract_text_alchemy(doc["page"])

			for key in keywords[:7]:
				print "KEY: ", key
				doc1 = nlp(key["text"].strip() )
	        
				similarity = []
				print
				for k, v in keyword_risk.items():
					doc2 = nlp(k.strip() )
				
					similarity.append( doc1.similarity(doc2) )
					print "Sim between %s & %s is: %f" % (doc1, doc2, doc1.similarity(doc2))

				if max(similarity) > 0:
					document_risks.append({ "text": key["text"] , "risk": max(similarity) * v } )


			# push the risk to DB
			create_user_profile(doc["id"], document_risks)









if __name__ == '__main__':
	main()
	#demographic_adjusted_R()



