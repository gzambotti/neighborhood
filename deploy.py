from flask import Flask, render_template, request, redirect, Response, jsonify, send_file
from flask import make_response
import psycopg2, json, os, io, csv
from io import StringIO




app = Flask(__name__)

@app.route('/')
#def index():
#	return render_template('index.html', name='neighborhood')
#	return '<h1>Deploy to Heroku!!!</h1>'

def output():        
	# serve index template
	return render_template('index.html', name='neighborhood')


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
    conn_string = "dbname='postgis_30_sample' host='localhost' user='postgres' password='boston2006'"
    # connect to the PostgreSQL database
    conn = psycopg2.connect(conn_string)
    
    # connect to the PostgreSQL database
    #conn = psycopg2.connect(conn_string)
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


@app.route('/data', methods = ['GET'])
def post():
    conn_string = "dbname='postgis_30_sample' host='localhost' user='postgres' password=''"
    # connect to the PostgreSQL database
    conn = psycopg2.connect(conn_string)
    sql = "SELECT * FROM survey;"
    cur = conn.cursor()
    cur.execute(sql)
    a = [];
    for record in cur:        
        a.append(record)
    # Use the COPY function on the SQL we created above.
    #csvList = "COPY ({0}) TO STDOUT WITH CSV HEADER".format(sql)
    si = StringIO()
    cw = csv.writer(si)
    cw.writerows(a)
    output = make_response(si.getvalue())
    output.headers["Content-Disposition"] = "attachment; filename=export.csv"
    output.headers["Content-type"] = "text/csv"
    
    print (a)

    return output    

@app.route('/export', methods = ['GET'])
def csv_export():

    sql = "' SELECT * FROM survey '"
    
    #sql = """ SELECT * from survey; """
    
    cur = conn.cursor()

    # Use the COPY function on the SQL we created above.
    SQL_for_file_output = "COPY ({0}) TO STDOUT WITH CSV HEADER".format(sql)    
    
    """
      Base on a couple of answer on Stack Overflow
    """
    si = io.BytesIO()
    cw = csv.writer(si, dialect='excel', encoding='utf-8-sig')
    cw.writerows(SQL_for_file_output)
    output = make_response(si.getvalue())
    output.headers["Content-Disposition"] = "attachment; filename=export.csv"
    output.headers["Content-type"] = "text/csv"
    
    # Clean up: Close the database cursor and connection
    cur.close()
    conn.close()

    return output

if __name__ == '__main__':
	# run!
	app.run(debug=True)
 