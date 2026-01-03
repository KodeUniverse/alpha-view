FROM python:3.14.2-alpine3.23
WORKDIR /app
COPY services/python-marketdata/requirements.txt ./ 
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "main.py"]
