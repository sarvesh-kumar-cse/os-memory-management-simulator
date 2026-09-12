# Dynamic Memory Management Visualizer

Interactive browser-based visualizer for Paging, Segmentation, and Virtual Memory.

## Included modules
- Paging: FIFO and LRU via Flask REST API
- Segmentation: First Fit and Best Fit with address translation
- Virtual Memory: Page Table, TLB, FIFO/LRU eviction, hit/fault statistics

## Run
```bash
pip install -r requirements.txt
python app.py
```
Then open `http://127.0.0.1:5000/`.

## Source note
The code was extracted from the supplied project report Appendix C. The report states that its CSS is presented as focused/old-style snippets rather than a full source listing, so `styles.css` preserves those snippets and adds only minimal structural CSS needed for the referenced HTML classes. `app.py` contains obvious PDF text-extraction repairs for Python special names (`__name__`, `__file__`, `__main__`).
