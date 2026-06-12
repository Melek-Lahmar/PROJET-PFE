"""Script LibreOffice : ouvre le docx, met à jour TOUS les champs (TOC, listes, 
SEQ), sauve, puis exporte en PDF."""
import subprocess, time, os, uno
from com.sun.star.beans import PropertyValue

def make_property(name, value):
    p = PropertyValue()
    p.Name = name
    p.Value = value
    return p

# Lance soffice en mode listen
proc = subprocess.Popen(
    ["soffice", "--headless", "--norestore", "--nologo", "--nodefault",
     "--accept=socket,host=localhost,port=2002;urp;StarOffice.ServiceManager"],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
)
time.sleep(8)

local_context = uno.getComponentContext()
resolver = local_context.ServiceManager.createInstanceWithContext(
    "com.sun.star.bridge.UnoUrlResolver", local_context)
ctx = resolver.resolve(
    "uno:socket,host=localhost,port=2002;urp;StarOffice.ComponentContext")
smgr = ctx.ServiceManager
desktop = smgr.createInstanceWithContext("com.sun.star.frame.Desktop", ctx)

src = "file:///home/user/PROJET-PFE/Rapport/Rapport_PFE_Final.docx"
props = (make_property("Hidden", True), make_property("ReadOnly", False))
doc = desktop.loadComponentFromURL(src, "_blank", 0, props)

# Met à jour les champs et indices
doc.refresh()
indexes = doc.getDocumentIndexes()
for i in range(indexes.getCount()):
    indexes.getByIndex(i).update()
doc.refresh()

# Sauve
doc.store()

# Export PDF
pdf_props = (
    make_property("FilterName", "writer_pdf_Export"),
    make_property("Overwrite", True),
)
doc.storeToURL("file:///home/user/PROJET-PFE/Rapport/Rapport_PFE_Final.pdf", pdf_props)

doc.close(True)
print("OK")
