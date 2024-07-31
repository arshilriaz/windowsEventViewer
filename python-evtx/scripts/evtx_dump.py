import os
import json
import xmltodict
import Evtx.Evtx as evtx
import Evtx.Views as e_views
 
def main():
    import argparse
 
    parser = argparse.ArgumentParser(description="Dump a binary EVTX file into XML.")
    parser.add_argument("evtx", type=str, help="Path to the Windows EVTX event log file")
    parser.add_argument("hostname", type=str, help="Hostname for the output file naming")
    parser.add_argument("username", type=str, help="Username for the output file naming")
    parser.add_argument("password", type=str, help="Password for the output file naming")
    args = parser.parse_args()
 
    filename = f"{args.hostname}_{args.username}_{args.password}.json"
    output_dir_initial = os.getcwd() + "/" + os.getenv("MODEL_OUTPUT_DIR")
    output_dir = output_dir_initial.replace("\\", "/")
    output_path = os.path.join(output_dir, filename)
    output_path = output_path.replace("/python-evtx/scripts", "")
 
    # Ensure directory exists
    os.makedirs(output_dir, exist_ok=True)
    
    if os.path.exists(output_path):
        os.remove(output_path)
    
    with evtx.Evtx(args.evtx) as log:
        with open(output_path, 'a') as f:  # Append mode if file already exists
            f.write("[\n")  # Start of the JSON list, only if file is empty
            first_record = True
            for record in log.records():
                if not first_record:
                    f.write(",\n")  # Add a comma before every new record except the first
                json.dump(xmltodict.parse(record.xml()), f, indent=4)
                first_record = False
            f.write("\n]")  # End of the JSON list

        with open(output_path, 'r') as read_file:
                logs_json = {
                    "hostname": args.hostname,
                    "username": args.username,
                    "password": args.password,
                    "application": json.loads(read_file.read())
                }
                with(open(output_path, 'w')) as write_file:
                    json.dump(logs_json, write_file, indent=4)
 
if __name__ == "__main__":
    main()