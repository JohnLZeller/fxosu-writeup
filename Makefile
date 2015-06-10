default:
	pdflatex group2_final.tex
	pdflatex group2_final.tex

clean:
	rm group2_final.aux
	rm group2_final.log
	rm group2_final.out
	rm group2_final.toc