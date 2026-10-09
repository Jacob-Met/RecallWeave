import base64, hashlib, json, sys, zlib
PACKET_PIN={"bytes":57026,"sha256":"4e2d456c6ee8e93785d24134d6cee0fd195d2009d0fa323599cb72f255323796","gitBlob":"edc1b39db4008193291e80ba18a3e8847ef3f8e2"}
EXPECTED=[{"name":"supervisor","bytes":24685,"sha256":"b527c69a7fa128711bc10159a744e97e28d04eb04fc4e7d4c05d1a370a58b02d","gitBlob":"6789249ec8cf6769d82a95d85a18223a0f1c7840","compressedBytes":8315,"compressedSha256":"3fbfa1203c56e5b7dc9795a47235dac096ade2f346b7debba58282916619d4e8"},{"name":"driver","bytes":57288,"sha256":"930f1eb5d79bdc01c8d4345822d9318077fdec29cec67f8d918d67a611d5fab3","gitBlob":"0f654871b830adf7e41d4243a9935cf9dd9a0ce7","compressedBytes":18938,"compressedSha256":"3f50113b62dca088f525cb57598d19781ecd717174a9657e757d9cb29ce23939"},{"name":"plan","bytes":24340,"sha256":"2755416f70d8f86ac502334b937fc0ffe9d18054d48eba67bbc9570ff77bd863","gitBlob":"134d66dbf1ceb54b8e87b857b81fc3405ace70c0","compressedBytes":7129,"compressedSha256":"b1b441595adb403cebbd85c664ba25886f73e6f7ecffa03a120bf4719135db77"},{"name":"freeze","bytes":12473,"sha256":"e912d4d210e87b2194192ab154fa7dc284df52e2ecdfd00816c75ea5fc672b6e","gitBlob":"dfd2eb3d9dede88fe747ffdb8d2e892ed5c9f6d7","compressedBytes":5010,"compressedSha256":"7842d81b23df5eb0ab47ec555c78089fbd572893971af96d9957b5d486340ec1"},{"name":"prefix","bytes":4801,"sha256":"b02be8777162afa224b4e793266c6939efe97a5f7e497e023e40c747b45b3942","gitBlob":"75c50d1e72ab98912be376bfa4770bc42e7bf601","compressedBytes":2248,"compressedSha256":"e0004a786c181b7925a4b905fb68b20f56648370f91364144acf364db351af09"}]
def decode_packet(text):
 body=text.encode("utf-8")
 if len(body)!=PACKET_PIN["bytes"] or hashlib.sha256(body).hexdigest()!=PACKET_PIN["sha256"]: raise RuntimeError("exact compressed transport packet differs")
 data=json.loads(text)
 if data.get("schema")!="recallweave.lp.mac-continuation-transport/1" or set(data)!={"schema","parts"} or len(data["parts"])!=5: raise RuntimeError("transport schema or part count differs")
 result=[]
 for item,pin in zip(data["parts"],EXPECTED):
  if set(item)!=set(pin)|{"zlibBase64"} or any(item[k]!=pin[k] for k in pin): raise RuntimeError("transport part metadata differs")
  compressed=base64.b64decode(item["zlibBase64"],validate=True)
  if len(compressed)!=pin["compressedBytes"] or hashlib.sha256(compressed).hexdigest()!=pin["compressedSha256"]: raise RuntimeError("compressed part differs")
  decoder=zlib.decompressobj()
  decoded=decoder.decompress(compressed,pin["bytes"]+1)
  if len(decoded)!=pin["bytes"] or not decoder.eof or decoder.unused_data or decoder.unconsumed_tail: raise RuntimeError("decoded part framing or bound differs")
  if hashlib.sha256(decoded).hexdigest()!=pin["sha256"] or hashlib.sha1(("blob "+str(len(decoded))+"\0").encode()+decoded).hexdigest()!=pin["gitBlob"]: raise RuntimeError("decoded exact source differs")
  result.append(decoded.decode("utf-8","strict"))
 if sum(len(x.encode("utf-8")) for x in result)!=123587: raise RuntimeError("decoded total differs")
 return result
if __name__=="__main__":
 if len(sys.argv)!=2: raise RuntimeError("one pinned transport packet required")
 texts=decode_packet(sys.argv[1])
 sys.argv=["-c",*texts]
 exec(compile(texts[0],"supervise-continuation.py","exec"),globals())
