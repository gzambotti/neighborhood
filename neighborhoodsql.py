"""
__author__ = "Giovanni Zambotti"
__copyright__ = ""
__credits__ = ["Giovanni Zambotti"]
__license__ = "GPL"
__version__ = "1.0.0"
__maintainer__ = "Giovanni Zambotti"
__email__ = "g.zambotti@gmail.com"
__status__ = "Production"
__note__= Script to update a feature service from a text file
"""

#from  IPython.display import display
import time, json, os
from copy import deepcopy
from io import StringIO
import psycopg2
#from config import config
import sys
#!flask/bin/python
from flask import Flask, render_template, request, redirect, Response, jsonify, send_file
import random, json


app = Flask(__name__)

@app.route('/')
def output():        
	# serve index template
	return render_template('index.html', name='neighborhood')

@app.route('/add', methods=['POST'])
def add():
        print ("Hello")
        a = request.form.get('a', 0, type=int)
        b = request.form.get('b', 0, type=str)
        portal('{"attributes": {"id": ' + a + ',"name": "z888","zipcode": "' + b + '","date": "20181203"}}')
        return jsonify(result=a + b)

@app.route('/receiver', methods = ['POST'])
def worker1():        
	# read json + reply
	data = request.get_json(force=True)
	
	d = json.dumps(data)
	print (d)
    #insert_vendor(d)
	#portal1(d)
	result = 'test'
	#for item in data:
                # loop over every row
		#result = str(item['id']) + "-" + str(item["name"]) + "-" + str(item['zipcode']) + "-" + str(item['date'])                
    #            result = 'test'
	return result

@app.route('/receiver', methods = ['POST'])
def worker2():        
    # read json + reply
    data = request.get_json(force=True)
    
    d = json.dumps(data)
    print (d)
    #portal2(d)
    result = 'test'
    
    return result

#gis = GIS("https://www.arcgis.com", os.getenv("user_house"), os.getenv("passwd_house"), verify_cert=False)
# update wifi dataset (snr5, snr2.4, and nextgen)

def portal1(house_json):    
    # get the snr feature service from portal
    snr5_features = gis.content.get('b93189cdca254eb3ab310baa87ce4053')
    snr5_fset = snr5_features.tables[0] #querying without any conditions returns all the features
    print (house_json)
    d = json.loads(house_json)
    #add_result = snr5_fset.edit_features(adds = [house_dict])
    add_result = snr5_fset.edit_features(adds = [d])
    add_result
    #print (snr5_fset.sdf.head())

def portal2(house_json):    
    snr5_features = gis.content.get('382d49165290429f94ba511eddad6938')
    snr5_fset = snr5_features.tables[0]
    print (house_json)
    d = json.loads(house_json)
    #add_result = snr5_fset.edit_features(adds = [house_dict])
    add_result = snr5_fset.edit_features(adds = [d])
    add_result
    #house_json = [{"attributes": {"sessionID":"eeeee","siteID":"d1","supportScale":"d1","proposalVote":"d1","pyesno":"yes"}}, {"attributes": {"sessionID":"zzzzz","siteID":"d2","supportScale":"d2","proposalVote":"d2","pyesno":"no"}}]
    """
    c = house_json
    for b in house_json:
        print(b)
        d = json.dumps(c)
        dd = json.loads(d)
        add_result = snr5_fset.edit_features(adds = [dd])
        add_result


    """ 
@app.route('/survey', methods = ['POST'])
def survey():
    """ insert a new vendor into the vendors table """
    #sql = """INSERT INTO vendors(vendor_name) VALUES(%s) RETURNING vendor_id;"""
    #d = json.dumps(value)
    #print (d)
    d = request.get_json(force=True)
    value = json.dumps(d)
    print (value, type(value))
    
    sql = """INSERT INTO survey SELECT * FROM json_populate_record (NULL::survey, '""" + value + """' ); """
    #sql = """INSERT INTO survey SELECT * FROM json_populate_record (NULL::survey,'{"sessionID":"O9999999","geoid":["250173549002","250173549003","250173546003","250173546004"]}');"""
    
    conn_string = "dbname='postgis_30_sample' host='localhost' user='postgres' password=''"
    # connect to the PostgreSQL database
    conn = psycopg2.connect(conn_string)
    try:
        # read database configuration
        #params = config()
        
        # create a new cursor
        cur = conn.cursor()
        # execute the INSERT statement
        #cur.execute(sql, (vendor_name,))
        cur.execute(sql)
        # get the generated id back
        #vendor_id = cur.fetchone()[0]
        # commit the changes to the database
        conn.commit()
        # close communication with the database
        cur.close()
    except (Exception, psycopg2.DatabaseError) as error:
        print(error)
    finally:
        if conn is not None:
            conn.close()

    return "test"
    

@app.route('/table'+ time.strftime("%Y%m%d") +'.csv')
def output_dataframe_csv():
    
    output = StringIO()
    table1 = gis.content.get('b93189cdca254eb3ab310baa87ce4053')
    t1 = table1.tables[0].query()
    df1 = t1.sdf

    table2 = gis.content.get('382d49165290429f94ba511eddad6938')
    t2 = table2.tables[0].query()
    df2 = t2.sdf
    # tables join 
    df = pd.merge(df1, df2, on='sessionID', how='left')
    #export_csv = df.to_csv (r'export.csv', index = None, header=True) 
    df.to_csv(output)

    return Response(output.getvalue(), mimetype="text/csv")

if __name__ == '__main__':
	# run!
	app.run(debug=True)
    #insert_vendor('{"sessionID":"33333333","geoid":["250173549002","250173549003","250173546003","250173546004"]}')
    

