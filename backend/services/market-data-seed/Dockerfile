FROM python:3.14.2-alpine3.23
WORKDIR /app

RUN apk add python3-dev postgresql18-dev

COPY services/market-data-seed/requirements.txt ./ 
RUN pip install -r requirements.txt
COPY services/market-data-seed/ ./
CMD ["python", "main.py"]
