#    "AALTMDE ", "ABODALC", "ABODANL", "ABODCOC", "ABODHAL", "ABODHER ", "ACTDEVER ", 
#  "AD_MDEA3", "AD_MDEA1", "ADDEYRR",  

cols <- c("CIGEVER", "MJEVER", "COCEVER",  "CRKEVER", "HEREVER", "LSD", "PCP", "PEYOTE", "MESC", "PSILCY", "ECSTASY", "HALNOLST", "DARVTYLC","ACTDEVER", "SUICTHNK", "SUICTRY")
# load the dataset
data <- da35509.0001[cols]
#remove NAs
#data_clean <- data[complete.cases(data),]
# logistic regression # suicide VS tobacco brand

#MODEL FOR SMOKING
fit_cig <- glm(da35509.0001$SUICTHNK ~ da35509.0001$CIGEVER, data=da35509.0001, family="binomial")
# ODDS:
exp(coef(fit_cig))

#MODEL FOR Marijuana
fit_mar <- glm(da35509.0001$SUICTHNK ~ da35509.0001$MJEVER, data=da35509.0001, family="binomial")
exp(coef(fit_mar))

#MODEL FOR COCAIN
fit_coc <- glm(da35509.0001$SUICTHNK ~ da35509.0001$COCEVER, data=da35509.0001, family="binomial")
exp(coef(fit_coc))

# Trying suicide after thinking about it
fit_sui <- glm(da35509.0001$SUICTRY ~ da35509.0001$SUICTHNK, data=da35509.0001, family="binomial")
exp(coef(fit_sui))
