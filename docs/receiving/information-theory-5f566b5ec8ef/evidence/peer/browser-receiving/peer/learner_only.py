from pathlib import Path
import hashlib
import json
import sys
from browser_runner import ROOT,run_receiver
from learner_phase import receive_learner

def phase(page,context,out):
    course=ROOT/"evidence/browser-navigation30/fixed-downloads/information-theory.json"
    assert hashlib.sha256(course.read_bytes()).hexdigest()=="1ed27859b54da0f8a836f8e0d8f176f04727dbf3852e10c4b7310446a0f0742b"
    result=receive_learner(page,ROOT/"source/demo.html",course,ROOT/"peer/derived-answers-before-key.json",out/"learner")
    return {"scope":"Unfinished learner-only receiving; uses actual prior lab course download. Completed lab controls are not replayed.","earlierPhase":"browser-navigation30","learner":result}

if __name__=="__main__":
    assert len(sys.argv)==2
    raise SystemExit(run_receiver(sys.argv[1],phase))
