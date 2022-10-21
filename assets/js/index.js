((d, c) => {
    const TBL_FORECAST = d.getElementById("tblForecast"),
        CHRT_FORECAST = d.getElementById("chrtForecast")
    const startMonth = 11,
        startYear = 2022,
        endMonth = 11,
        endYear = 2024;
            Date.prototype.addDays = function (days) {
        var date = new Date(this.valueOf());
        date.setDate(date.getDate() + days);
        return date;
    }

    function getDates(startDate, stopDate) {
        var dateArray = new Array();
        var currentDate = startDate;
        while (currentDate <= stopDate) {
            dateArray.push(new Date(currentDate));
            currentDate = currentDate.addDays(1);
        }
        return dateArray;
    }

    function orderByDate(a, b) {
        let aSplit = a.split("-")
        let bSplit = b.split("-")
        let aStringDate = aSplit[1] + "-" + aSplit[0] + "-01"
        let bStringDate = bSplit[1] + "-" + bSplit[0] + "-01"
        return new Date(aStringDate) - new Date(bStringDate);
    }

    async function FinancialRecords_GetData() {
        const url = "assets/resources/financial_records_data.json";
        var myHeaders = new Headers();
        var myInit = {
            method: 'GET',
            headers: myHeaders,
            mode: 'cors',
            cache: 'default'
        };
        var myRequest = new Request(url, myInit);
        let result = {}
        const response = await fetch(myRequest);
        const jsonResponse = await response.json();
        return jsonResponse;
    }
    async function TimeRules_GetData() {
        const url = "assets/resources/time_rules_data.json";
        var myHeaders = new Headers();
        var myInit = {
            method: 'GET',
            headers: myHeaders,
            mode: 'cors',
            cache: 'default'
        };
        var myRequest = new Request(url, myInit);
        let result = {}
        const response = await fetch(myRequest);
        const jsonResponse = await response.json();
        return jsonResponse;
    }

    function getMonthAndYears() {
        let startDate = new Date(`${startYear}/${startMonth}/01`),
            endDate = new Date(`${endYear}/${endMonth}/01`)
        let dates = getDates(startDate, endDate);
        var re = _.groupBy(dates, function (item) {
            let monthNumber = item.getMonth() + 1;
            return (monthNumber + "-" + item.getFullYear());
        })
        let monthAndYears = [];
        for (let i in re) {
            monthAndYears.push(i)
        }
        let result = monthAndYears.sort(orderByDate)
        return result
    }

    async function Forecast_GetMultiplierByTimeRule(data) {
        let multiplierAmount = 0;
        let intervalTimeRules = await TimeRules_GetData()
        c(intervalTimeRules)
        let intervalData = intervalTimeRules.filter(x => x.id == data.IntervalTimeType)[0];
        if (data.monthIndex % intervalData.TimeIndex == 0) {
            if (intervalData.TimesPerRule > 0) {
                multiplierAmount = intervalData.TimesPerRule;
            } else {
                multiplierAmount = 30;
            }
        }
        return multiplierAmount
    }

    async function Forecast_CalculateByTimeRules(data) {
        let monthForecast = {
            month: data.monthId,
            amount: 0,
            concept: data.concept,
            montType: data.montType
        }
        let amount = data.Amount;
        let multiplierAmount = 0;
        multiplierAmount = await Forecast_GetMultiplierByTimeRule({
            monthIndex: data.monthIndex,
            IntervalTimeType: data.IntervalTimeType
        });
        monthForecast.amount = amount * multiplierAmount;
        return monthForecast

    }

    function numberWithCommas(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    function Forecast_DrawChart(data) {
        const labels_arr = [...new Set(data.map(item => item.month))];
        //c(labels)
        const in_dataset = data.filter(x => x.montType == "Ingreso");
        let itemsToSum;
        let in_arr = []
        for (let label of labels_arr) {
            itemsToSum = in_dataset.filter(x => x.month == label);
            const sum = itemsToSum.reduce((partialSum, a) => partialSum + a.amount, 0);
            in_arr.push(sum)
        }
        const out_dataset = data.filter(x => x.montType == "Egreso");
        let out_arr = []
        for (let label of labels_arr) {
            itemsToSum = out_dataset.filter(x => x.month == label);
            const sum = itemsToSum.reduce((partialSum, a) => partialSum + a.amount, 0);
            out_arr.push(sum)
        }
        let monthName = "",
            inSum = 0,
            outSum = 0,
            inOut_diff = 0,
            diffSum = 0;
        let tBody = "";
        for (let i = 0; i < labels_arr.length; i++) {
            monthName = labels_arr[i];
            inSum = in_arr[i]
            outSum = out_arr[i]
            inOut_diff = inSum - outSum;
            diffSum += inOut_diff;
            tBody += `<tr>
                <td>${monthName}</td>
                <td>${inSum}</td>
                <td>${outSum}</td>
                <td>${inOut_diff}</td>
            </tr>`;
            if (i == (labels_arr.length - 1)) {
                tBody += `<tr>
                <td colspan="3" style="text-align:right"><b>Total restante:</b></td>
                <td><b>$${numberWithCommas(diffSum)}</b></td>
            </tr>`;
            }
        }
        TBL_FORECAST.querySelector("tbody").innerHTML = tBody
        const mixedChart = new Chart(CHRT_FORECAST, {
            data: {
                datasets: [{
                    type: 'line',
                    label: 'Ingresos',
                    data: in_arr,
                    backgroundColor: 'rgb(60, 179, 113)',
                    borderColor: 'rgb(60, 179, 113)'
                }, {
                    type: 'line',
                    label: 'Egresos',
                    data: out_arr,
                    backgroundColor: 'rgb(255, 99, 132)',
                    borderColor: 'rgb(255, 99, 132)'
                }],
                labels: labels_arr
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Forecast'
                    },
                },
                interaction: {
                    intersect: false,
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Value'
                        },
                        suggestedMin: -10,
                        suggestedMax: 200
                    }
                }
            },
        });


    }

    function init() {

    }

    async function ForecastEntry() {
        let financialDataResponse = await FinancialRecords_GetData();
        let monthAndYearList = getMonthAndYears()
        const monthlyForecast = []
        let result = {}
        for (let item of financialDataResponse) {
            let monthIndex = 0
            for (let monthData of monthAndYearList) {
                if (monthIndex == 13) {
                    monthIndex = 1
                }
                result = await Forecast_CalculateByTimeRules({
                    concept: item.Description,
                    monthId: monthData,
                    montType: item.AmountType,
                    IntervalTimeType: item.IntervalTimeType,
                    monthIndex,
                    Amount: item.Amount
                })
                monthlyForecast.push(result)
                monthIndex++;
            }
        }
        Forecast_DrawChart(monthlyForecast);
    }
    d.addEventListener("DOMContentLoaded", e => {
        try {
            ForecastEntry();
        } catch (ex) {
            alert(ex)
            throw ex;
        }
    })

})(document, console.log)